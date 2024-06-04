import React from 'react';

import { Table } from '@digdir/designsystemet-react';

import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function GridSummary2Component({ summaryNode }): JSX.Element | null {
  const { rows, textResourceBindings } = summaryNode.item;
  const { title, description } = textResourceBindings ?? {};

  function renderTableCell(cell: { node: LayoutNode<'Grid'>; text: string; rowReadOnly: boolean }) {
    const isTextNode = !!cell?.text;
    const bindingTitle = cell?.node?.item?.textResourceBindings?.title;
    const hasBindingTitle = !!bindingTitle;
    if (hasBindingTitle) {
      return <div>{bindingTitle}</div>;
    } else if (isTextNode) {
      return <div>{cell.text}</div>;
    } else {
      // TODO: Add support for heading from component ref
      return <div>Cell</div>;
    }
  }

  function renderTableHeaderCells(cells) {
    return cells.map((cell, cellIndex) => (
      <Table.HeaderCell key={`cell-${cellIndex}`}>{renderTableCell(cell)}</Table.HeaderCell>
    ));
  }

  function renderTableBodyCells(cells) {
    return cells.map((cell, cellIndex) => <Table.Cell key={`cell-${cellIndex}`}>{renderTableCell(cell)}</Table.Cell>);
  }

  function renderTableBodyRows(rows) {
    return (
      <Table.Body>
        {rows.map((row, index) => (
          <Table.Row key={`row-${index}`}>{renderTableBodyCells(row.cells)}</Table.Row>
        ))}
      </Table.Body>
    );
  }

  function renderTableHeaderRows(rows) {
    return (
      <Table.Head>
        {rows.map((row, index) => (
          <Table.Row key={`row-${index}`}>{renderTableHeaderCells(row.cells)}</Table.Row>
        ))}
      </Table.Head>
    );
  }

  function getRowType(row) {
    return row?.header ? 'header' : 'body';
  }

  function groupRowsByType(rows) {
    const groupedRows: { type: string; rows: object[] }[] = []; // Initialize groupedRows as an empty array
    const currentType = getRowType(rows[0]);
    let currentGroup: { type: string; rows: Array<object> } = {
      type: currentType,
      rows: [],
    };
    for (let i = 0; i < rows.length; i++) {
      if (getRowType(rows[i]) === currentGroup.type) {
        currentGroup.rows.push(rows[i]);
      } else {
        groupedRows.push(currentGroup);
        currentGroup = {
          type: getRowType(rows[i]),
          rows: [rows[i]],
        };
      }
    }
    groupedRows.push(currentGroup); // Push the currentGroup object into the groupedRows array
    return groupedRows;
  }

  function renderTableRows(rows) {
    const groupedRows = groupRowsByType(rows);
    return groupedRows.map((group) => {
      if (group.type === 'header') {
        return renderTableHeaderRows(group.rows);
      } else if (group.type === 'body') {
        return renderTableBodyRows(group.rows);
      }
    });
  }

  return (
    <>
      <p>{title}</p>
      <p>{description}</p>
      <Table id={summaryNode?.item?.id}>{renderTableRows(rows)}</Table>
    </>
  );
}
