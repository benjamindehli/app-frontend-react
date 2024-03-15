import React, { forwardRef } from 'react';

import { isAttachmentUploaded } from 'src/features/attachments';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { FileUploadWithTagDef } from 'src/layout/FileUploadWithTag/config.def.generated';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { CompFileUploadWithTagInternal } from 'src/layout/FileUploadWithTag/config.generated';
import type { CompInternal } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class FileUploadWithTag extends FileUploadWithTagDef implements ValidateComponent<'FileUploadWithTag'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'FileUploadWithTag'>>(
    function LayoutComponentFileUploadWithTagRender(props, _): JSX.Element | null {
      return <FileUploadComponent {...props} />;
    },
  );

  evalExpressions({
    item,
    evalTrb,
    evalCommon,
    evalExpr,
  }: ExprResolver<'FileUploadWithTag'>): CompInternal<'FileUploadWithTag'> {
    return {
      ...item,
      ...evalCommon(item),
      ...evalTrb(item),
      alertOnDelete: evalExpr<boolean | undefined>(item.alertOnDelete, false),
    };
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  getDisplayData(
    node: LayoutNode<'FileUploadWithTag'>,
    item: CompFileUploadWithTagInternal,
    { attachments }: DisplayDataProps,
  ): string {
    return (attachments[node.getId()] || []).map((a) => a.data.filename).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUploadWithTag'>): JSX.Element | null {
    return <AttachmentSummaryComponent targetNode={targetNode} />;
  }

  // This component does not have empty field validation, so has to override its inherited method
  runEmptyFieldValidation(): ComponentValidation[] {
    return [];
  }

  runComponentValidation(
    node: LayoutNode<'FileUploadWithTag'>,
    item: CompFileUploadWithTagInternal,
    { attachments }: ValidationDataSources,
  ): ComponentValidation[] {
    const validations: ComponentValidation[] = [];

    // Validate minNumberOfAttachments
    const id = node.getId();
    if (
      item.minNumberOfAttachments > 0 &&
      (!attachments[id] || attachments[id]!.length < item.minNumberOfAttachments)
    ) {
      validations.push({
        message: {
          key: 'form_filler.file_uploader_validation_error_file_number',
          params: [item.minNumberOfAttachments],
        },
        severity: 'error',
        source: FrontendValidationSource.Component,
        componentId: id,
        // Treat visibility of minNumberOfAttachments the same as required to prevent showing an error immediately
        category: ValidationMask.Required,
      });
    }

    // Validate missing tags
    for (const attachment of attachments[id] || []) {
      if (
        isAttachmentUploaded(attachment) &&
        (attachment.data.tags === undefined || attachment.data.tags.length === 0)
      ) {
        const tagKey = item.textResourceBindings?.tagTitle;
        const tagReference = tagKey
          ? {
              key: tagKey,
              makeLowerCase: true,
            }
          : 'tag';

        validations.push({
          message: {
            key: 'form_filler.file_uploader_validation_error_no_chosen_tag',
            params: [tagReference],
          },
          severity: 'error',
          componentId: id,
          source: FrontendValidationSource.Component,
          meta: { attachmentId: attachment.data.id },
          // Treat visibility of missing tag the same as required to prevent showing an error immediately
          category: ValidationMask.Required,
        });
      }
    }

    return validations;
  }

  isDataModelBindingsRequired(node: LayoutNode<'FileUploadWithTag'>): boolean {
    // Data model bindings are only required when the component is defined inside a repeating group
    return !(node.parent instanceof LayoutPage) && node.parent.isType('RepeatingGroup');
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'FileUploadWithTag'>): string[] {
    const { node, item } = ctx;
    const { dataModelBindings } = item;
    const isRequired = this.isDataModelBindingsRequired(node);
    const hasBinding = dataModelBindings && ('simpleBinding' in dataModelBindings || 'list' in dataModelBindings);

    if (!isRequired && !hasBinding) {
      return [];
    }
    if (isRequired && !hasBinding) {
      return [
        `En simpleBinding, eller list-datamodellbinding, er påkrevd for denne komponenten når den brukes ` +
          `i en repeterende gruppe, men dette mangler i layout-konfigurasjonen.`,
      ];
    }

    const simpleBinding =
      dataModelBindings && 'simpleBinding' in dataModelBindings ? dataModelBindings.simpleBinding : undefined;
    const listBinding = dataModelBindings && 'list' in dataModelBindings ? dataModelBindings.list : undefined;

    if (simpleBinding) {
      return this.validateDataModelBindingsSimple(ctx);
    }

    if (listBinding) {
      return this.validateDataModelBindingsList(ctx);
    }

    return [];
  }
}
