import React from 'react';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import type { PropsFromGenericComponent } from 'src/components';
import type { IAltinnWindow } from 'src/types';

import { AltinnLoader } from 'altinn-shared/components';
import { getLanguageFromKey } from 'altinn-shared/utils/language';

export interface IButtonProvidedProps
  extends PropsFromGenericComponent<'Button'> {
  disabled: boolean;
}

const buttonStyle = {
  marginBottom: '0',
  width: '100%',
};

const altinnLoaderStyle = {
  marginLeft: '40px',
  marginTop: '2px',
  height: '45px', // same height as button
};

const btnGroupStyle = {
  marginTop: '3.6rem',
  marginBottom: '0',
};

const rowStyle = {
  marginLeft: '0',
};

export function ButtonComponent({ id, text, language }: IButtonProvidedProps) {
  const dispatch = useAppDispatch();
  const autoSave = useAppSelector(
    (state) => state.formLayout.uiConfig.autoSave,
  );
  const isSubmitting = useAppSelector((state) => state.formData.isSubmitting);
  const isSaving = useAppSelector((state) => state.formData.isSaving);
  const ignoreWarnings = useAppSelector(
    (state) => state.formData.ignoreWarnings,
  );

  const renderSubmitButton = () => {
    return (
      <div className='pl-0 a-btn-sm-fullwidth'>
        {isSubmitting ? (
          renderLoader()
        ) : (
          <button
            type='submit'
            className='a-btn a-btn-success'
            onClick={submitForm}
            id={id}
            style={buttonStyle}
          >
            {text}
          </button>
        )}
      </div>
    );
  };

  const renderSaveButton = () => {
    return (
      <div className='col-2 pl-0 a-btn-sm-fullwidth'>
        {isSaving ? (
          renderLoader()
        ) : (
          <button
            type='submit'
            className='a-btn a-btn-success'
            onClick={saveFormData}
            id='saveBtn'
            style={buttonStyle}
          >
            Lagre
          </button>
        )}
      </div>
    );
  };

  const saveFormData = () => {
    dispatch(FormDataActions.submit({}));
  };

  const renderLoader = () => {
    return (
      <AltinnLoader
        srContent={getLanguageFromKey('general.loading', language)}
        style={altinnLoaderStyle}
      />
    );
  };

  const submitForm = () => {
    const { org, app, instanceId } = window as Window as IAltinnWindow;
    dispatch(
      FormDataActions.submit({
        url: `${window.location.origin}/${org}/${app}/api/${instanceId}`,
        apiMode: 'Complete',
        stopWithWarnings: !ignoreWarnings,
      }),
    );
  };

  return (
    <div className='container pl-0'>
      <div
        className='a-btn-group'
        style={btnGroupStyle}
      >
        <div
          className='row'
          style={rowStyle}
        >
          {autoSave === false && renderSaveButton()}
          {renderSubmitButton()}
        </div>
      </div>
    </div>
  );
}
