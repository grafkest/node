import { Badge } from '@consta/uikit/Badge';
import { Loader } from '@consta/uikit/Loader';
import React, { useMemo } from 'react';
import ForceGraph2D, { NodeObject, LinkObject } from 'react-force-graph-2d';
import type { DomainNode, ModuleNode, ArtifactNode, GraphLink } from '../data';
import styles from './GraphView.module.css';

type GraphNode =
  | ({ type: 'module' } & ModuleNode)
  | ({ type: 'domain' } & DomainNode)
  | ({ type: 'artifact'; reuseScore?: number } & ArtifactNode);

type GraphViewProps = {
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
  links: GraphLink[];
  showDependencies: boolean;
  onSelect: (node: GraphNode | null) => void;
  highlightedNode: string | null;
};

type ForceNode = NodeObject & GraphNode;
type ForceLink = LinkObject & GraphLink;

const graphColors: Record<GraphNode['type'], string> = {
  module: '#FF8C69',
  domain: '#5B8FF9',
  artifact: '#45C7B0'
};

const GraphView: React.FC<GraphViewProps> = ({
  modules,
  domains,
  artifacts,
  links,
  showDependencies,
  onSelect,
  highlightedNode
}) => {
  const graphData = useMemo(() => {
    const flatDomains = flattenDomains(domains);
    const domainNodes: GraphNode[] = flatDomains.map((domain) => ({
      ...domain,
      type: 'domain'
    }));

    const artifactNodes: GraphNode[] = artifacts.map((artifact) => ({
      ...artifact,
      type: 'artifact',
      reuseScore: 0
    }));

    const moduleNodes: GraphNode[] = modules.map((module) => ({
      ...module,
      type: 'module'
    }));

    const filteredLinks = links.filter((link) => link.type !== 'dependency' || showDependencies);

    return {
      nodes: [...domainNodes, ...artifactNodes, ...moduleNodes],
      links: filteredLinks
    };
  }, [modules, domains, artifacts, links, showDependencies]);

  return (
    <div className={styles.container}>
      <div className={styles.legend}>
        <Badge label="Модуль" size="s" style={{ backgroundColor: graphColors.module }} />
        <Badge label="Домен" size="s" style={{ backgroundColor: graphColors.domain }} />
        <Badge label="Артефакт" size="s" style={{ backgroundColor: graphColors.artifact }} />
      </div>
      <React.Suspense fallback={<Loader size="m" />}> 
        <ForceGraph2D
          width={undefined}
          height={undefined}
          graphData={graphData}
          nodeLabel={(node: ForceNode) => node.name ?? node.id}
          linkColor={(link: ForceLink) =>
            link.type === 'dependency'
              ? '#B8B8B8'
              : link.type === 'produces'
                ? '#45C7B0'
                : '#5B8FF9'
          }
          nodeCanvasObject={(node: ForceNode, ctx, globalScale) => {
            drawNode(node, ctx, globalScale, highlightedNode);
          }}
          onNodeClick={(node) => {
            onSelect(node as ForceNode);
          }}
        />
      </React.Suspense>
    </div>
  );
};

function flattenDomains(domains: DomainNode[]): DomainNode[] {
  return domains.flatMap((domain) => [domain, ...(domain.children ? flattenDomains(domain.children) : [])]);
}

function drawNode(node: ForceNode, ctx: CanvasRenderingContext2D, globalScale: number, highlighted: string | null) {
  const label = node.name ?? node.id;
  const fontSize = 12 / Math.sqrt(globalScale);
  const radius = node.type === 'module' ? 10 : node.type === 'domain' ? 8 : 6;
  ctx.beginPath();
  ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = graphColors[node.type];
  ctx.globalAlpha = highlighted && node.id !== highlighted ? 0.5 : 1;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1F1F1F';
  ctx.fillText(label, (node.x ?? 0), (node.y ?? 0) + radius + 4);
}

export type { GraphNode };
export default GraphView;
