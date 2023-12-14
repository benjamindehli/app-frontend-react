/* eslint-disable no-console */
import React, { useCallback, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { useMutation } from '@tanstack/react-query';
import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { diffModels } from 'src/features/formData/diffModels';
import { useFormDataWriteGatekeepers } from 'src/features/formData/FormDataWriteGatekeepers';
import { createFormDataWriteStore } from 'src/features/formData/FormDataWriteStateMachine';
import { RepeatingGroupsProvider } from 'src/features/formData/RepeatingGroupsProvider';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useMemoDeepEqual } from 'src/hooks/useMemoDeepEqual';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { isAxiosError } from 'src/utils/isAxiosError';
import type { FormDataWriteGatekeepers } from 'src/features/formData/FormDataWriteGatekeepers';
import type { FDNewValues, FormDataContext } from 'src/features/formData/FormDataWriteStateMachine';
import type { IFormData } from 'src/features/formData/index';
import type { SaveWhileTyping } from 'src/layout/common.generated';
import type { IDataModelBindings } from 'src/layout/layout';
import type { IDataAfterDataModelSave } from 'src/types/shared';

export type FDValue = string | number | boolean | object | undefined | null | FDValue[];
export type FDFreshness = 'current' | 'debounced';

type SetLeafValueForBindings<B extends IDataModelBindings> = (key: keyof Exclude<B, undefined>, newValue: any) => void;
type SetMultiLeafValuesForBindings<B extends IDataModelBindings> = (
  changes: { binding: keyof Exclude<B, undefined>; newValue: any }[],
) => void;

interface MutationArg {
  dataModelUrl: string;
  newData: object;
  diff: Record<string, any>;
}

interface FormDataContextInitialProps {
  url: string;
  initialData: object;
  autoSaving: boolean;
  gatekeepers: FormDataWriteGatekeepers;
}

const { Provider, useSelector } = createZustandContext({
  name: 'FormDataWrite',
  required: true,
  initialCreateStore: ({ url, initialData, autoSaving, gatekeepers }: FormDataContextInitialProps) =>
    createFormDataWriteStore(url, initialData, autoSaving, gatekeepers),
});

function createFormDataRequestFromDiff(modelToSave: object, diff: object) {
  const data = new FormData();
  data.append('dataModel', JSON.stringify(modelToSave));
  data.append('previousValues', JSON.stringify(diff));
  return data;
}

const useFormDataSaveMutation = (ctx: FormDataContext) => {
  const { doPutFormData } = useAppMutations();
  const { saveFinished } = ctx;

  return useMutation({
    mutationKey: ['saveFormData'],
    mutationFn: async (arg: MutationArg) => {
      const { dataModelUrl, newData, diff } = arg;
      const data = createFormDataRequestFromDiff(newData, diff);
      try {
        const metaData = await doPutFormData.call(dataModelUrl, data);
        saveFinished(newData, metaData?.changedFields);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 303) {
          // Fallback to old behavior if the server responds with 303 when there are changes. We handle these just
          // like we handle 200 responses.
          const metaData = error.response.data as IDataAfterDataModelSave;
          saveFinished(newData, metaData?.changedFields);
          return;
        }
        throw error;
      }
    },
  });
};

interface FormDataWriterProps extends PropsWithChildren {
  url: string;
  initialData: object;
  autoSaving: boolean;
}

export function FormDataWriteProvider({ url, initialData, autoSaving, children }: FormDataWriterProps) {
  const gatekeepers = useFormDataWriteGatekeepers();
  return (
    <Provider
      url={url}
      autoSaving={autoSaving}
      gatekeepers={gatekeepers}
      initialData={initialData}
    >
      <FormDataEffects url={url} />
      <RepeatingGroupsProvider initialFormData={initialData}>{children}</RepeatingGroupsProvider>
    </Provider>
  );
}

function FormDataEffects({ url }: { url: string }) {
  const state = useSelector((s) => s);
  const { debounce, currentData, debouncedCurrentData, lastSavedData, controlState } = state;
  const { debounceTimeout, autoSaving, manualSaveRequested, lockedBy } = controlState;
  const { mutate, isLoading: isSaving, error } = useFormDataSaveMutation(state);
  const ruleConnections = useAppSelector((state) => state.formDynamics.ruleConnection);

  // This component re-renders on every keystroke in a form field. We don't want to save on every keystroke, nor
  // create a new performSave function after every save, so we use a ref to make sure the performSave function
  // and the unmount effect always have the latest values.
  const currentDataRef = React.useRef(currentData);
  currentDataRef.current = currentData;
  const lastSavedDataRef = React.useRef(lastSavedData);
  lastSavedDataRef.current = lastSavedData;
  const isSavingRef = React.useRef(isSaving);
  isSavingRef.current = isSaving;

  // If errors occur, we want to throw them so that the user can see them, and they
  // can be handled by the error boundary.
  if (error) {
    throw error;
  }

  const performSave = useCallback(
    (dataToSave: object) => {
      const toSaveFlat = dot.dot(dataToSave);
      const lastSavedDataFlat = dot.dot(lastSavedDataRef.current);
      const diff = diffModels(toSaveFlat, lastSavedDataFlat);

      if (!Object.keys(diff).length) {
        return;
      }

      if (isSavingRef.current) {
        return;
      }

      console.log('debug, saving data model', dataToSave, lastSavedDataRef.current, diff);
      mutate({
        dataModelUrl: url,
        newData: dataToSave,
        diff,
      });
    },
    [mutate, url],
  );

  // Debounce the data model when the user stops typing. This has the effect of triggering the useEffect below,
  // saving the data model to the backend. Freezing can also be triggered manually, when a manual save is requested.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentData !== debouncedCurrentData) {
        debounce(ruleConnections);
      }
    }, debounceTimeout);

    return () => {
      clearTimeout(timer);
    };
  }, [ruleConnections, debounce, currentData, debouncedCurrentData, debounceTimeout]);

  // Save the data model when the data has been frozen to debouncedCurrentData and is different from the saved data
  useEffect(() => {
    const hasUnsavedDebouncedChanges =
      debouncedCurrentData !== lastSavedData && !deepEqual(debouncedCurrentData, lastSavedData);

    const shouldSave = hasUnsavedDebouncedChanges && !isSaving && !lockedBy;
    if (shouldSave && (autoSaving || manualSaveRequested)) {
      performSave(debouncedCurrentData);
    }
  }, [autoSaving, debouncedCurrentData, isSaving, lastSavedData, lockedBy, manualSaveRequested, performSave]);

  // Always save unsaved changes when the user navigates away from the page and this component is unmounted.
  // We cannot put the current and last saved data in the dependency array, because that would cause the effect
  // to trigger when the user is typing, which is not what we want.
  useEffect(
    () => () => {
      const hasUnsavedChanges =
        currentDataRef.current !== lastSavedDataRef.current &&
        !deepEqual(currentDataRef.current, lastSavedDataRef.current);
      if (hasUnsavedChanges) {
        performSave(currentDataRef.current);
      }
    },
    [performSave],
  );

  return null;
}

const useHasUnsavedChanges = () =>
  useSelector((s) => s.lastSavedData !== s.currentData && !deepEqual(s.lastSavedData, s.currentData));

const useWaitForSave = () => {
  const url = useSelector((s) => s.controlState.saveUrl);
  const hasUnsavedChanges = useHasUnsavedChanges();
  const waitForState = useWaitForState({
    cacheKey: ['hasUnsavedChanges', url],
    currentState: hasUnsavedChanges,
  });

  return useCallback(() => waitForState((unsavedChanges) => !unsavedChanges), [waitForState]);
};

export const FD = {
  /**
   * This will return the form data as a dot map, where the keys are dot-separated paths. This is the same format
   * as the older form data. Consider using any of the newer methods instead, which may come with performance benefits.
   * This will always give you the debounced (late) data, which may or may not be saved to the backend yet.
   */
  useDebouncedDotMap(): IFormData {
    const debouncedCurrentData = useSelector((v) => v.debouncedCurrentData);
    return useMemo(() => dot.dot(debouncedCurrentData), [debouncedCurrentData]);
  },

  /**
   * This will return the form data as a deep object, just like the server sends it to us (and the way we send it back).
   */
  useAsObject: (freshness: FDFreshness = 'debounced') =>
    useSelector((v) => (freshness === 'current' ? v.currentData : v.debouncedCurrentData)),

  /**
   * This returns a single value, as picked from the form data. The data is always converted to a string.
   * If the path points to a complex data type, like an object or array, an empty string is returned.
   * Use this when you expect a string/leaf value, and provide that to a controlled React component
   */
  usePickFreshString: (path: string | undefined): string => {
    const value = useSelector((v) => (path ? dot.pick(path, v.currentData) : undefined));
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value.toString() : '';
  },

  /**
   * This is like the one above, but for multiple values. The values in the input object is expected to be
   * dot-separated paths, and the return value will be an object with the same keys, but with the values picked
   * from the form data.
   */
  usePickFreshStrings: <B extends IDataModelBindings>(_bindings: B): { [key in keyof B]: string } => {
    const bindings = _bindings as any;
    const currentData = useSelector((s) => s.currentData);

    return useMemo(
      () =>
        new Proxy({} as { [key in keyof B]: string }, {
          get(_, _key): any {
            const key = _key.toString();
            const binding = key in bindings && bindings[key];
            const value = binding && dot.pick(binding, currentData);
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              return value.toString();
            }
            return '';
          },
        }),
      [bindings, currentData],
    );
  },

  /**
   * This returns a value, as picked from the form data. It may also return an array, object or null.
   * If you only expect a string/leaf value, use usePickString() instead.
   */
  usePickFreshAny: (path: string | undefined): FDValue => {
    const currentData = useSelector((s) => s.currentData);
    return useMemoDeepEqual(path ? dot.pick(path, currentData) : undefined);
  },

  /**
   * This returns multiple values, as picked from the form data. The values in the input object is expected to be
   * dot-separated paths, and the return value will be an object with the same keys, but with the values picked
   * from the form data. If a value is not found, undefined is returned. Null may also be returned if the value
   * is explicitly set to null.
   */
  useFreshBindings: <T extends IDataModelBindings | undefined>(
    bindings: T,
  ): T extends undefined ? Record<string, never> : { [key in keyof T]: FDValue } => {
    const currentData = useSelector((s) => s.currentData);
    const out: any = {};
    if (bindings) {
      for (const key of Object.keys(bindings)) {
        out[key] = dot.pick(bindings[key], currentData);
      }
    }

    return useMemoDeepEqual(out);
  },

  /**
   * This returns the raw method for setting a value in the form data. This is useful if you want to
   * set a value in the form data.
   */
  useSetLeafValue: () => useSelector((s) => s.setLeafValue),

  /**
   * Use this hook to get a function you can use to set a single value in the form data, using a binding.
   */
  useSetForBinding: (binding: string | undefined, saveWhileTyping?: SaveWhileTyping) => {
    const setLeafValue = useSelector((s) => s.setLeafValue);

    return useCallback(
      (newValue: any) => {
        if (!binding) {
          window.logWarn(`No data model binding found, silently ignoring request to save ${newValue}`);
          return;
        }
        setLeafValue({
          path: binding,
          newValue,
          debounceTimeout: typeof saveWhileTyping === 'number' ? saveWhileTyping : undefined,
        });
      },
      [binding, saveWhileTyping, setLeafValue],
    );
  },

  /**
   * Use this hook to get a function you can use to set multiple values in the form data, using a data model bindings
   * object.
   */
  useSetForBindings: <B extends IDataModelBindings>(
    bindings: B,
    saveWhileTyping?: SaveWhileTyping,
  ): SetLeafValueForBindings<B> => {
    const setLeafValue = useSelector((s) => s.setLeafValue);

    return useCallback(
      (key: keyof B, newValue: any) => {
        const binding = (bindings as any)[key];
        if (!binding) {
          const keyAsString = key as string;
          window.logWarn(
            `No data model binding found for ${keyAsString}, silently ignoring request to save ${newValue}`,
          );
          return;
        }
        setLeafValue({
          path: binding,
          newValue,
          debounceTimeout: typeof saveWhileTyping === 'number' ? saveWhileTyping : undefined,
        });
      },
      [bindings, saveWhileTyping, setLeafValue],
    );
  },

  /**
   * Use this hook to get a function you can use to set multiple values in the form data atomically, using a data model
   * bindings object.
   */
  useMultiSetForBindings: <B extends IDataModelBindings>(
    bindings: B,
    saveWhileTyping?: SaveWhileTyping,
  ): SetMultiLeafValuesForBindings<B> => {
    const setMultiLeafValues = useSelector((s) => s.setMultiLeafValues);

    return useCallback(
      (changes: { binding: keyof B; newValue: any }[]) => {
        const realChanges: FDNewValues = {
          changes: [],
          debounceTimeout: typeof saveWhileTyping === 'number' ? saveWhileTyping : undefined,
        };

        for (const change of changes) {
          const { binding: key, newValue } = change;
          const bindingPath = (bindings as any)[key];
          if (!bindingPath) {
            const keyAsString = key as string;
            window.logWarn(
              `No data model binding found for ${keyAsString}, silently ignoring request to save ${newValue}`,
            );
            return;
          }
          realChanges.changes.push({
            path: bindingPath,
            newValue,
          });
        }

        if (realChanges.changes.length > 0) {
          setMultiLeafValues(realChanges);
        }
      },
      [bindings, saveWhileTyping, setMultiLeafValues],
    );
  },

  /**
   * The locking functionality allows you to prevent form data from saving, even if the user stops typing (or navigates
   * to the next page). This is useful if you want to perform a server-side action that requires the form data to be
   * in a certain state. Locking will effectively ignore all saving until you unlock it again.
   */
  useLocking(lockId: string) {
    const rawLock = useSelector((s) => s.lock);
    const rawUnlock = useSelector((s) => s.unlock);
    const requestSave = useSelector((s) => s.requestManualSave);
    const ruleConnections = useAppSelector((s) => s.formDynamics.ruleConnection);

    const lockedBy = useSelector((s) => s.controlState.lockedBy);
    const isLocked = lockedBy !== undefined;
    const isLockedByMe = lockedBy === lockId;

    const hasUnsavedChanges = useHasUnsavedChanges();
    const waitForSave = useWaitForSave();

    const lock = useCallback(async () => {
      if (isLocked && !isLockedByMe) {
        window.logWarn(`Form data is already locked by ${lockedBy}, cannot lock it again (requested by ${lockId})`);
      }
      if (isLocked) {
        return false;
      }

      if (hasUnsavedChanges) {
        requestSave(ruleConnections);
        await waitForSave();
      }

      rawLock(lockId);
      return true;
    }, [
      hasUnsavedChanges,
      isLocked,
      isLockedByMe,
      lockId,
      lockedBy,
      rawLock,
      requestSave,
      ruleConnections,
      waitForSave,
    ]);

    const unlock = useCallback(
      (changedFields?: IFormData) => {
        if (!isLocked) {
          window.logWarn(`Form data is not locked, cannot unlock it (requested by ${lockId})`);
        }
        if (!isLockedByMe) {
          window.logWarn(`Form data is locked by ${lockedBy}, cannot unlock it (requested by ${lockId})`);
        }
        if (!isLocked || !isLockedByMe) {
          return false;
        }

        rawUnlock(changedFields);
        return true;
      },
      [isLocked, isLockedByMe, lockId, lockedBy, rawUnlock],
    );

    return { lock, unlock, isLocked, lockedBy, isLockedByMe };
  },

  /**
   * Returns a function you can use to wait until the form data is saved.
   */
  useWaitForSave,

  /**
   * Returns true if the form data has unsaved changes
   */
  useHasUnsavedChanges,

  /**
   * Returns a function to append a value to a list. It checks if the value is already in the list, and if not,
   * it will append it. If the value is already in the list, it will not be appended.
   */
  useAppendToListUnique: () => useSelector((s) => s.appendToListUnique),

  /**
   * Returns a function to remove a value from a list, by index. You should try to avoid using this, as it might
   * not do what you want if it is triggered at a moment where your copy of the form data is outdated. Calling this
   * function twice in a row for index 0 will remove the first item in the list, even if the list has changed in
   * the meantime.
   */
  useRemoveIndexFromList: () => useSelector((s) => s.removeIndexFromList),

  /**
   * Returns a function to remove a value from a list, by value. If your list contains unique values, this is the
   * safer alternative to useRemoveIndexFromList().
   */
  useRemoveValueFromList: () => useSelector((s) => s.removeValueFromList),
};