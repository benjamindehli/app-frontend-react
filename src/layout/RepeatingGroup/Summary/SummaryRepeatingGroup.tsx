import React from 'react';

import cn from 'classnames';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { CompCategory } from 'src/layout/common';
import { LargeGroupSummaryContainer } from 'src/layout/RepeatingGroup/Summary/LargeGroupSummaryContainer';
import classes from 'src/layout/RepeatingGroup/Summary/SummaryRepeatingGroup.module.css';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { HRepGroupRow } from 'src/layout/RepeatingGroup/config.generated';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ISummaryRepeatingGroup {
  changeText: string | null;
  onChangeClick: () => void;
  summaryNode: LayoutNode<'Summary'>;
  targetNode: LayoutNode<'RepeatingGroup'>;
  overrides?: ISummaryComponent['overrides'];
}

export function SummaryRepeatingGroup({
  onChangeClick,
  changeText,
  summaryNode,
  targetNode,
  overrides,
}: ISummaryRepeatingGroup) {
  const excludedChildren = summaryNode.item.excludedChildren;
  const display = overrides?.display || summaryNode.item.display;
  const { langAsString } = useLanguage();
  const formDataSelector = FD.useDebouncedSelector();

  const inExcludedChildren = (n: LayoutNode) =>
    excludedChildren && (excludedChildren.includes(n.getId()) || excludedChildren.includes(n.getBaseId()));

  const groupValidations = useDeepValidationsForNode(targetNode);
  const groupHasErrors = hasValidationErrors(groupValidations);

  const textBindings = targetNode.item.textResourceBindings as ITextResourceBindings;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const ariaLabel = langAsString(summaryTitleTrb ?? summaryAccessibleTitleTrb ?? titleTrb);

  const rows: HRepGroupRow[] = [];
  for (const row of targetNode.item.rows) {
    if (!row || row.groupExpressions?.hiddenRow || row.index === undefined) {
      continue;
    }
    rows.push(row);
  }

  if (summaryNode.item.largeGroup && overrides?.largeGroup !== false && rows.length) {
    return (
      <>
        {rows.map((row) => (
          <LargeGroupSummaryContainer
            key={`summary-${targetNode.getId()}-${row.uuid}`}
            id={`summary-${targetNode.getId()}-${row.index}`}
            groupNode={targetNode}
            onlyInRowUuid={row.uuid}
            renderLayoutNode={(n) => {
              if (inExcludedChildren(n) || n.isHidden()) {
                return null;
              }

              return (
                <SummaryComponent
                  key={n.getId()}
                  summaryNode={summaryNode}
                  overrides={{
                    ...overrides,
                    targetNode: n,
                    grid: {},
                    largeGroup: false,
                  }}
                />
              );
            }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      <div
        data-testid={'summary-group-component'}
        style={{ width: '100%' }}
      >
        <div className={classes.container}>
          <span
            className={cn(classes.label, groupHasErrors && !display?.hideValidationMessages && classes.labelWithError)}
          >
            <Lang id={summaryTitleTrb ?? titleTrb} />
          </span>

          {!display?.hideChangeButton ? (
            <EditButton
              onClick={onChangeClick}
              editText={changeText}
              label={ariaLabel}
            />
          ) : null}
        </div>
        <div style={{ width: '100%' }}>
          {rows.length === 0 ? (
            <span className={classes.emptyField}>
              <Lang id={'general.empty_summary'} />
            </span>
          ) : (
            rows
              .filter((row) =>
                targetNode.children(undefined, { onlyInRowUuid: row.uuid }).some((child) => !child.isHidden()),
              )
              .map((row) => {
                const childSummaryComponents = targetNode
                  .children(undefined, { onlyInRowUuid: row.uuid })
                  .filter((n) => !inExcludedChildren(n))
                  .map((child) => {
                    if (child.isHidden() || !child.isCategory(CompCategory.Form)) {
                      return;
                    }
                    const RenderCompactSummary = child.def.renderCompactSummary.bind(child.def);
                    return (
                      <RenderCompactSummary
                        onChangeClick={onChangeClick}
                        changeText={changeText}
                        key={child.getId()}
                        targetNode={child as any}
                        summaryNode={summaryNode}
                        overrides={{}}
                        formDataSelector={formDataSelector}
                      />
                    );
                  });

                return (
                  <div
                    data-testid={'summary-repeating-row'}
                    key={`row-${row.uuid}`}
                    className={classes.border}
                  >
                    {childSummaryComponents}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {groupHasErrors && !display?.hideValidationMessages && (
        <div className={classes.gridStyle}>
          <ErrorPaper message={<Lang id={'group.row_error'} />} />
          <div>
            {!display?.hideChangeButton && (
              <button
                className={classes.link}
                onClick={onChangeClick}
                type='button'
              >
                <Lang id={'form_filler.summary_go_to_correct_page'} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
