import { CG } from 'src/codegen/CG';
import { LabelRendering } from 'src/codegen/Config';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Container,
  rendersWithLabel: LabelRendering.InSelf,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
  functionality: {
    customExpressions: false,
  },
}).addProperty(new CG.prop('rows', CG.common('GridRows')));
