import { Checkbox } from '@consta/uikit/Checkbox';
import { Collapse } from '@consta/uikit/Collapse';
import { Text } from '@consta/uikit/Text';
import React, { useMemo, useState } from 'react';
import type { DomainNode } from '../data';
import styles from './DomainTree.module.css';

type DomainTreeProps = {
  tree: DomainNode[];
  selected: Set<string>;
  descendants: Map<string, string[]>;
  onToggle: (domainId: string) => void;
};

type TreeItemProps = {
  node: DomainNode;
  selected: Set<string>;
  descendants: Map<string, string[]>;
  onToggle: (id: string) => void;
  depth?: number;
};

const TreeItem: React.FC<TreeItemProps> = ({ node, selected, descendants, onToggle, depth = 0 }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = useMemo(() => depth * 16, [depth]);
  const cascade = useMemo(() => descendants.get(node.id) ?? [node.id], [descendants, node.id]);
  const isChecked = useMemo(() => cascade.every((id) => selected.has(id)), [cascade, selected]);
  const isIntermediate = useMemo(
    () => !isChecked && cascade.some((id) => selected.has(id)),
    [cascade, isChecked, selected]
  );

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
                checked={isChecked}
                intermediate={isIntermediate}
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
                    descendants={descendants}
                    onToggle={onToggle}
                    depth={depth + 1}
                  />
                ))}
          </Collapse>
        ) : (
          <Checkbox
            checked={isChecked}
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

const DomainTree: React.FC<DomainTreeProps> = ({ tree, selected, descendants, onToggle }) => {
  return (
    <div className={styles.tree}>
      {tree.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          selected={selected}
          descendants={descendants}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};

export default DomainTree;
