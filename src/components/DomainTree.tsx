import { Checkbox } from '@consta/uikit/Checkbox';
import { Collapse } from '@consta/uikit/Collapse';
import { Text } from '@consta/uikit/Text';
import React, { useMemo, useState } from 'react';
import type { DomainNode } from '../data';
import styles from './DomainTree.module.css';

type DomainTreeProps = {
  tree: DomainNode[];
  selected: Set<string>;
  onToggle: (domainId: string) => void;
};

type TreeItemProps = {
  node: DomainNode;
  selected: Set<string>;
  onToggle: (id: string) => void;
  depth?: number;
};

const TreeItem: React.FC<TreeItemProps> = ({ node, selected, onToggle, depth = 0 }) => {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = useMemo(() => depth * 16, [depth]);

  return (
    <div className={styles.item} style={{ paddingLeft }}>
      <div className={styles.header}>
        {hasChildren ? (
          <Collapse
            label={<Text size="s">{node.name}</Text>}
            isOpen={open}
            onClick={() => setOpen((prev) => !prev)}
            iconPosition="left"
            className={styles.collapse}
          >
            <div className={styles.checkboxRow}>
              <Checkbox
                checked={selected.has(node.id)}
                onChange={() => onToggle(node.id)}
                size="s"
                label={
                  <div className={styles.leafLabel}>
                    <Text size="s" weight="semibold">
                      {node.name}
                    </Text>
                    {node.description && (
                      <Text size="xs" view="secondary">
                        {node.description}
                      </Text>
                    )}
                  </div>
                }
              />
            </div>
            {open &&
              node.children?.map((child) => (
                <TreeItem
                  key={child.id}
                  node={child}
                  selected={selected}
                  onToggle={onToggle}
                  depth={depth + 1}
                />
              ))}
          </Collapse>
        ) : (
          <Checkbox
            checked={selected.has(node.id)}
            onChange={() => onToggle(node.id)}
            size="s"
            label={
              <div className={styles.leafLabel}>
                <Text size="s" weight="semibold">
                  {node.name}
                </Text>
                {node.description && (
                  <Text size="xs" view="secondary">
                    {node.description}
                  </Text>
                )}
              </div>
            }
          />
        )}
      </div>
      {!hasChildren && <div className={styles.spacer} />}
    </div>
  );
};

const DomainTree: React.FC<DomainTreeProps> = ({ tree, selected, onToggle }) => {
  return (
    <div className={styles.tree}>
      {tree.map((node) => (
        <TreeItem key={node.id} node={node} selected={selected} onToggle={onToggle} />
      ))}
    </div>
  );
};

export default DomainTree;
