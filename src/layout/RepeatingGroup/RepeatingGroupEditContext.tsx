import React, { useCallback, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { CompRepeatingGroupInternal } from 'src/layout/RepeatingGroup/config.generated';

interface RepeatingGroupEditRowContext {
  multiPageEnabled: boolean;
  multiPageIndex: number;
  nextMultiPage: () => void;
  prevMultiPage: () => void;
  hasNextMultiPage: boolean;
  hasPrevMultiPage: boolean;
}

const { Provider, useCtx } = createContext<RepeatingGroupEditRowContext>({
  name: 'RepeatingGroupEditRow',
  required: true,
});

function useRepeatingGroupEditRowState(
  node: BaseLayoutNode<CompRepeatingGroupInternal>,
  editId: string,
): RepeatingGroupEditRowContext & { setMultiPageIndex: (index: number) => void } {
  const multiPageEnabled = node.item.edit?.multiPage ?? false;
  const lastPage = useMemo(() => {
    const row = node.item.rows.find((r) => r.uuid === editId);
    let lastPage = 0;
    for (const childNode of row?.items ?? []) {
      lastPage = Math.max(lastPage, childNode.item.multiPageIndex ?? 0);
    }
    return lastPage;
  }, [editId, node.item.rows]);

  const [multiPageIndex, setMultiPageIndex] = useState(0);

  const nextMultiPage = useCallback(() => {
    setMultiPageIndex((prev) => Math.min(prev + 1, lastPage));
  }, [lastPage]);

  const prevMultiPage = useCallback(() => {
    setMultiPageIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    multiPageEnabled,
    multiPageIndex,
    nextMultiPage,
    prevMultiPage,
    hasNextMultiPage: multiPageEnabled && multiPageIndex < lastPage,
    hasPrevMultiPage: multiPageEnabled && multiPageIndex > 0,
    setMultiPageIndex,
  };
}

interface Props {
  editId: string;
}

export function RepeatingGroupEditRowProvider({ editId, children }: PropsWithChildren<Props>) {
  const { node } = useRepeatingGroup();
  const { setMultiPageIndex, ...state } = useRepeatingGroupEditRowState(node, editId);

  useRegisterNodeNavigationHandler((targetNode) => {
    if (!state.multiPageEnabled) {
      // Nothing to do here. Other navigation handlers will make sure this row is opened for editing.
      return false;
    }
    const ourChildRecursively = node.flat().find(targetNode.isSame());
    if (!ourChildRecursively) {
      return false;
    }
    const ourDirectChildren = node.children();
    const ourChildDirectly = ourDirectChildren.find(targetNode.isSame());
    if (ourChildDirectly) {
      const targetMultiPageIndex = targetNode.item.multiPageIndex ?? 0;
      if (targetMultiPageIndex !== state.multiPageIndex) {
        setMultiPageIndex(targetMultiPageIndex);
      }
      return true;
    }

    // It's our child, but not directly. We need to figure out which of our children contains the target node,
    // and navigate there. Then it's a problem that can be forwarded there.
    const ourChildrenIds = new Set(ourDirectChildren.map((n) => n.getId()));
    const childWeAreLookingFor = targetNode.parents((n) =>
      n && n instanceof BaseLayoutNode && n.getId() ? ourChildrenIds.has(n.getId()) : false,
    )[0];
    if (childWeAreLookingFor && !(childWeAreLookingFor instanceof LayoutPage)) {
      const targetMultiPageIndex = childWeAreLookingFor.item.multiPageIndex ?? 0;
      if (targetMultiPageIndex !== state.multiPageIndex) {
        setMultiPageIndex(targetMultiPageIndex);
      }
      return true;
    }

    return false;
  });

  return <Provider value={state}>{children}</Provider>;
}

export const useRepeatingGroupEdit = () => useCtx();
