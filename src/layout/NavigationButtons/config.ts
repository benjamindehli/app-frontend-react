import { CG } from 'src/codegen/CG';
import { LabelRendering } from 'src/codegen/Config';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
  rendersWithLabel: LabelRendering.Off,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: true,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'back',
      title: 'Back',
      description: 'Text on the back/previous page button',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'next',
      title: 'Next',
      description: 'Text on the next page button',
    }),
  )
  .addProperty(
    new CG.prop(
      'showBackButton',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Show back button')
        .setDescription("Shows two buttons (back/next) instead of just 'next'."),
    ),
  )
  .addProperty(new CG.prop('validateOnNext', CG.common('PageValidation').optional()))
  .addProperty(new CG.prop('validateOnPrevious', CG.common('PageValidation').optional()));
