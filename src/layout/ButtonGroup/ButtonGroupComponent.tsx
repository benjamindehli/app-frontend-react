import React from 'react';

import { Grid } from '@material-ui/core';

import type { PropsFromGenericComponent } from '..';

import classes from 'src/layout/ButtonGroup/ButtonGroupComponent.module.css';
import { GenericComponent } from 'src/layout/GenericComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function ButtonGroupComponent({ node }: PropsFromGenericComponent<'ButtonGroup'>) {
  const childNodes = node.item.childComponents;
  return (
    <Grid
      item
      container
      alignItems='center'
      className={classes.container}
      data-componentid={node.getId()}
    >
      {childNodes.map((n: LayoutNode) => (
        <div
          key={n.getId()}
          data-componentid={n.getId()}
        >
          <GenericComponent
            node={n}
            overrideDisplay={{ directRender: true }}
          />
        </div>
      ))}
    </Grid>
  );
}
