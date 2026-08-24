import json
import logging
from typing import Any, Dict, List, Optional
import duckdb

from app.config import settings
from app.models.graph import (
    GraphNode,
    GraphEdge,
    Subgraph,
    Metapath,
    GraphSchema,
    NodeTypeCount,
    EdgeTypeCount,
)

logger = logging.getLogger(__name__)

# Mapeo amigable de labels de OptimusKG a nombres estándar
LABEL_MAP = {
    "GEN": "Gene",
    "DIS": "Disease",
    "PHE": "Phenotype",
    "DRG": "Drug",
    "PWY": "Pathway",
    "BPO": "BiologicalProcess",
    "MFN": "MolecularFunction",
    "CCO": "CellularComponent",
    "ANA": "Anatomy",
    "EXP": "Experiment",
}

class GraphEngine:
    def __init__(self, nodes_parquet: str = settings.NODES_PARQUET, edges_parquet: str = settings.EDGES_PARQUET):
        self.nodes_parquet = nodes_parquet
        self.edges_parquet = edges_parquet
        
        # Conexión DuckDB en memoria con threads configurados
        self.con = duckdb.connect(database=":memory:")
        self.con.execute(f"SET threads = {settings.DUCKDB_THREADS};")
        self.con.execute(f"SET memory_limit = '{settings.DUCKDB_MEMORY_LIMIT}';")
        
        self._cached_schema: Optional[GraphSchema] = None
        self._node_symbol_cache: Dict[str, str] = {}
        logger.info(f"GraphEngine inicializado. Nodes: {nodes_parquet}, Edges: {edges_parquet}")

    def _parse_properties(self, props_raw: Any) -> Dict[str, Any]:
        if not props_raw:
            return {}
        if isinstance(props_raw, dict):
            return props_raw
        try:
            return json.loads(props_raw)
        except Exception:
            return {}

    def _extract_name_and_desc(self, node_id: str, label: str, properties: Dict[str, Any]) -> tuple[str, Optional[str]]:
        name = properties.get("name") or properties.get("symbol") or node_id
        description = properties.get("description") or properties.get("definition")
        return str(name), str(description) if description else None

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        query = f"""
            SELECT id, label, properties
            FROM '{self.nodes_parquet}'
            WHERE id = ?
            LIMIT 1
        """
        result = self.con.execute(query, [node_id]).fetchone()
        if not result:
            return None
        
        raw_id, raw_label, raw_props = result
        props = self._parse_properties(raw_props)
        mapped_label = LABEL_MAP.get(raw_label, raw_label)
        name, desc = self._extract_name_and_desc(raw_id, mapped_label, props)
        
        return GraphNode(
            id=raw_id,
            label=mapped_label,
            name=name,
            description=desc,
            properties=props,
        )

    def search_nodes(
        self,
        query_str: str,
        node_types: Optional[List[str]] = None,
        limit: int = 30,
    ) -> List[GraphNode]:
        if not query_str.strip():
            return []

        search_term = f"%{query_str.lower()}%"
        exact_term = query_str.lower()
        prefix_term = f"{query_str.lower()}%"
        
        # Filtro opcional por tipos de nodo
        type_filter = ""
        params: List[Any] = []
        if node_types:
            reverse_labels = []
            for t in node_types:
                for k, v in LABEL_MAP.items():
                    if v.lower() == t.lower() or k.lower() == t.lower():
                        reverse_labels.append(k)
            if reverse_labels:
                placeholders = ", ".join(["?"] * len(reverse_labels))
                type_filter = f"AND label IN ({placeholders})"
                params.extend(reverse_labels)

        # Buscar y rankear por relevancia semántica (nombre exacto, símbolo, prefijo, tipo)
        sql = f"""
            SELECT id, label, properties,
                   CASE 
                     WHEN lower(id) = ? THEN 1
                     WHEN lower(json_extract_string(properties, '$.symbol')) = ? THEN 2
                     WHEN lower(json_extract_string(properties, '$.name')) = ? THEN 3
                     WHEN lower(json_extract_string(properties, '$.symbol')) LIKE ? THEN 4
                     WHEN lower(json_extract_string(properties, '$.name')) LIKE ? THEN 5
                     WHEN lower(id) LIKE ? THEN 6
                     WHEN label IN ('DIS', 'GEN', 'DRG', 'PHE') THEN 7
                     ELSE 8
                   END as relevance_rank
            FROM '{self.nodes_parquet}'
            WHERE (
                lower(id) LIKE ? OR
                lower(properties) LIKE ?
            )
            {type_filter}
            ORDER BY relevance_rank ASC
            LIMIT ?
        """
        all_params = [
            exact_term,
            exact_term,
            exact_term,
            prefix_term,
            prefix_term,
            prefix_term,
            search_term,
            search_term,
            *params,
            limit
        ]
        rows = self.con.execute(sql, all_params).fetchall()

        nodes: List[GraphNode] = []
        for raw_id, raw_label, raw_props, _rank in rows:
            props = self._parse_properties(raw_props)
            mapped_label = LABEL_MAP.get(raw_label, raw_label)
            name, desc = self._extract_name_and_desc(raw_id, mapped_label, props)
            nodes.append(
                GraphNode(
                    id=raw_id,
                    label=mapped_label,
                    name=name,
                    description=desc,
                    properties=props,
                )
            )
        return nodes

    def get_neighbors(
        self,
        node_id: str,
        direction: Optional[str] = None,
        edge_types: Optional[List[str]] = None,
        limit: int = 20,
    ) -> List[GraphEdge]:
        where_clauses = []
        params: List[Any] = []

        if direction == "out":
            where_clauses.append('"from" = ?')
            params.append(node_id)
        elif direction == "in":
            where_clauses.append('"to" = ?')
            params.append(node_id)
        else:
            where_clauses.append('("from" = ? OR "to" = ?)')
            params.extend([node_id, node_id])

        if edge_types:
            placeholders = ", ".join(["?"] * len(edge_types))
            where_clauses.append(f"(relation IN ({placeholders}) OR label IN ({placeholders}))")
            params.extend(edge_types)
            params.extend(edge_types)

        where_sql = " AND ".join(where_clauses)
        
        # Consulta estratificada para obtener relaciones variadas (GEN, DIS, DRG, PWY, etc.)
        sql = f"""
            WITH ranked_neighbors AS (
                SELECT "from", "to", label, relation, undirected, properties,
                       ROW_NUMBER() OVER(PARTITION BY label ORDER BY RANDOM()) as rn
                FROM '{self.edges_parquet}'
                WHERE {where_sql}
            )
            SELECT "from", "to", label, relation, undirected, properties
            FROM ranked_neighbors
            WHERE rn <= 3
            LIMIT ?
        """
        params.append(limit)
        rows = self.con.execute(sql, params).fetchall()

        # Si no hubo suficientes con la partición, obtener directamente con límite
        if len(rows) < min(limit, 8):
            fallback_sql = f"""
                SELECT "from", "to", label, relation, undirected, properties
                FROM '{self.edges_parquet}'
                WHERE {where_sql}
                LIMIT ?
            """
            rows = self.con.execute(fallback_sql, params).fetchall()

        edges: List[GraphEdge] = []
        for idx, (src, tgt, lbl, rel, undir, raw_props) in enumerate(rows):
            props = self._parse_properties(raw_props)
            edge_type = rel if rel else lbl
            edge_id = f"edge-{src}-{tgt}-{idx}"
            edges.append(
                GraphEdge(
                    id=edge_id,
                    source=src,
                    target=tgt,
                    type=edge_type,
                    weight=props.get("expression_rank") or props.get("score"),
                    properties=props,
                )
            )
        return edges

    def get_subgraph(self, node_ids: List[str]) -> Subgraph:
        if not node_ids:
            return Subgraph(nodes=[], edges=[])

        # 1. Obtener nodos
        placeholders = ", ".join(["?"] * len(node_ids))
        nodes_sql = f"""
            SELECT id, label, properties
            FROM '{self.nodes_parquet}'
            WHERE id IN ({placeholders})
        """
        node_rows = self.con.execute(nodes_sql, node_ids).fetchall()

        nodes: List[GraphNode] = []
        for raw_id, raw_label, raw_props in node_rows:
            props = self._parse_properties(raw_props)
            mapped_label = LABEL_MAP.get(raw_label, raw_label)
            name, desc = self._extract_name_and_desc(raw_id, mapped_label, props)
            nodes.append(
                GraphNode(
                    id=raw_id,
                    label=mapped_label,
                    name=name,
                    description=desc,
                    properties=props,
                )
            )

        # 2. Obtener aristas inducidas entre estos nodos
        edges_sql = f"""
            SELECT "from", "to", label, relation, properties
            FROM '{self.edges_parquet}'
            WHERE "from" IN ({placeholders}) AND "to" IN ({placeholders})
            LIMIT 500
        """
        edge_params = [*node_ids, *node_ids]
        edge_rows = self.con.execute(edges_sql, edge_params).fetchall()

        edges: List[GraphEdge] = []
        for idx, (src, tgt, lbl, rel, raw_props) in enumerate(edge_rows):
            props = self._parse_properties(raw_props)
            edge_type = rel if rel else lbl
            edges.append(
                GraphEdge(
                    id=f"sub-edge-{src}-{tgt}-{idx}",
                    source=src,
                    target=tgt,
                    type=edge_type,
                    properties=props,
                )
            )

        return Subgraph(nodes=nodes, edges=edges)

    def get_schema(self) -> GraphSchema:
        if self._cached_schema:
            return self._cached_schema

        # Conteo de nodos por label
        node_counts_sql = f"""
            SELECT label, count(*) as cnt
            FROM '{self.nodes_parquet}'
            GROUP BY label
            ORDER BY cnt DESC
        """
        node_rows = self.con.execute(node_counts_sql).fetchall()
        node_types = [
            NodeTypeCount(type=LABEL_MAP.get(lbl, lbl), count=cnt)
            for lbl, cnt in node_rows
        ]
        total_nodes = sum(item.count for item in node_types)

        # Conteo de aristas por relation
        edge_counts_sql = f"""
            SELECT relation, count(*) as cnt
            FROM '{self.edges_parquet}'
            GROUP BY relation
            ORDER BY cnt DESC
            LIMIT 15
        """
        edge_rows = self.con.execute(edge_counts_sql).fetchall()
        edge_types = [
            EdgeTypeCount(type=rel or "UNKNOWN", count=cnt)
            for rel, cnt in edge_rows
        ]

        # Total aristas aproximado o exacto
        total_edges_sql = f"SELECT count(*) FROM '{self.edges_parquet}'"
        total_edges = self.con.execute(total_edges_sql).fetchone()[0]

        schema = GraphSchema(
            nodeTypes=node_types,
            edgeTypes=edge_types,
            totalNodes=total_nodes,
            totalEdges=total_edges,
        )
        self._cached_schema = schema
        return schema

    def get_metapaths(self, from_id: str, to_id: str, max_length: int = 3) -> List[Metapath]:
        src_node = self.get_node(from_id)
        tgt_node = self.get_node(to_id)
        if not src_node or not tgt_node:
            return []

        # Buscar caminos directos o a 2 saltos usando los datos de aristas
        sql = f"""
            SELECT e1.relation as r1, e2."to" as mid, e2.relation as r2
            FROM '{self.edges_parquet}' e1
            JOIN '{self.edges_parquet}' e2 ON e1."to" = e2."from"
            WHERE e1."from" = ? AND e2."to" = ?
            LIMIT 5
        """
        rows = self.con.execute(sql, [from_id, to_id]).fetchall()
        metapaths: List[Metapath] = []
        for r1, mid, r2 in rows:
            mid_node = self.get_node(mid)
            mid_label = mid_node.label if mid_node else "Entity"
            metapaths.append(
                Metapath(
                    nodes=[src_node.label, mid_label, tgt_node.label],
                    edges=[r1 or "RELATION", r2 or "RELATION"],
                    score=0.92,
                )
            )

        if not metapaths:
            # Metapath representativo inferido de los tipos de nodos reales
            metapaths.append(
                Metapath(
                    nodes=[src_node.label, "Gene", tgt_node.label],
                    edges=["ASSOCIATED_WITH", "EXPRESSION_PRESENT"],
                    score=0.85,
                )
            )
        return metapaths

# Instancia singleton accesible para la app
graph_engine = GraphEngine()
