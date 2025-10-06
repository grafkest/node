import { Badge } from '@consta/uikit/Badge';
import { Loader } from '@consta/uikit/Loader';
import { useTheme } from '@consta/uikit/Theme';
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

const GraphView: React.FC<GraphViewProps> = ({
  modules,
  domains,
  artifacts,
  links,
  showDependencies,
  onSelect,
  highlightedNode
}) => {
  const { theme } = useTheme();
  const themeClassName = theme?.className ?? 'default';

  const palette = useMemo(() => resolvePalette(themeClassName), [themeClassName]);

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
        <Badge label="Модуль" size="s" view="filled" status="warning" />
        <Badge label="Домен" size="s" view="filled" status="info" />
        <Badge label="Артефакт" size="s" view="filled" status="success" />
      </div>
      <React.Suspense fallback={<Loader size="m" />}>
        <ForceGraph2D
          width={undefined}
          height={undefined}
          graphData={graphData}
          nodeLabel={(node: ForceNode) => node.name ?? node.id}
          linkColor={(link: ForceLink) =>
            link.type === 'dependency'
              ? palette.linkDependency
              : link.type === 'produces'
                ? palette.linkProduces
                : link.type === 'consumes'
                  ? palette.linkConsumes
                  : palette.linkRelates
          }
          nodeCanvasObject={(node: ForceNode, ctx, globalScale) => {
            drawNode(node, ctx, globalScale, highlightedNode, palette);
          }}
          nodeCanvasObjectMode={() => 'replace'}
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

type GraphPalette = {
  module: string;
  domain: string;
  artifact: string;
  text: string;
  linkDependency: string;
  linkProduces: string;
  linkRelates: string;
  linkConsumes: string;
};

function drawNode(
  node: ForceNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  highlighted: string | null,
  palette: GraphPalette
) {
  const label = node.name ?? node.id;
  const fontSize = 12 / Math.sqrt(globalScale);
  const radius = node.type === 'module' ? 10 : node.type === 'domain' ? 8 : 6;
  ctx.save();
  ctx.beginPath();
  ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle =
    node.type === 'module'
      ? palette.module
      : node.type === 'domain'
        ? palette.domain
        : palette.artifact;
  ctx.globalAlpha = highlighted && node.id !== highlighted ? 0.5 : 1;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.text;
  ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + radius + 4);
  ctx.restore();
}

function resolvePalette(themeClassName?: string): GraphPalette {
  if (typeof window === 'undefined') {
    return DEFAULT_PALETTE;
  }

  const themeElement = themeClassName ? document.querySelector(`.${themeClassName}`) : null;
  const styles = getComputedStyle((themeElement as HTMLElement) ?? document.body);
  const getVar = (token: string, fallback: string) => styles.getPropertyValue(token).trim() || fallback;

  return {
    module: getVar('--color-bg-warning', DEFAULT_PALETTE.module),
    domain: getVar('--color-bg-info', DEFAULT_PALETTE.domain),
    artifact: getVar('--color-bg-success', DEFAULT_PALETTE.artifact),
    text: getVar('--color-typo-primary', DEFAULT_PALETTE.text),
    linkDependency: getVar('--color-bg-border', DEFAULT_PALETTE.linkDependency),
    linkProduces: getVar('--color-bg-success', DEFAULT_PALETTE.linkProduces),
    linkRelates: getVar('--color-bg-info', DEFAULT_PALETTE.linkRelates),
    linkConsumes: getVar('--color-bg-normal', DEFAULT_PALETTE.linkConsumes)
  };
}

const DEFAULT_PALETTE: GraphPalette = {
  module: '#FF8C69',
  domain: '#5B8FF9',
  artifact: '#45C7B0',
  text: '#1F1F1F',
  linkDependency: '#B8B8B8',
  linkProduces: '#45C7B0',
  linkRelates: '#5B8FF9',
  linkConsumes: '#8E8E93'
};

export type { GraphNode };
export default GraphView;
