import React from 'react';

import { GenericComponent } from 'src/layout/GenericComponent';
import type { PropsFromGenericComponent } from 'src/layout';

type IAccordionGroupProps = PropsFromGenericComponent<'AccordionGroup'>;

export const AccordionGroup = ({ node }: IAccordionGroupProps) => (
  <>
    {node.item.childComponents.map((n) => (
      <GenericComponent<'Accordion'>
        key={n.item.id}
        node={n}
        overrideItemProps={{
          renderAsAccordionItem: true,
        }}
      />
    ))}
  </>
);