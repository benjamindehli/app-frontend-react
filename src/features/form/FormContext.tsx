import React from 'react';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { AttachmentsProvider, AttachmentsStoreProvider } from 'src/features/attachments/AttachmentsContext';
import { DataModelsProvider } from 'src/features/datamodel/DataModelsProvider';
import { DynamicsProvider } from 'src/features/form/dynamics/DynamicsContext';
import { LayoutsProvider } from 'src/features/form/layout/LayoutsContext';
import { NavigateToNodeProvider } from 'src/features/form/layout/NavigateToNode';
import { PageNavigationProvider } from 'src/features/form/layout/PageNavigationContext';
import { LayoutSettingsProvider } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { RulesProvider } from 'src/features/form/rules/RulesContext';
import { useHasProcessProvider } from 'src/features/instance/ProcessContext';
import { ProcessNavigationProvider } from 'src/features/instance/ProcessNavigationContext';
import { AllOptionsProvider, AllOptionsStoreProvider } from 'src/features/options/useAllOptions';
import { ValidationProvider } from 'src/features/validation/validationContext';
import { NodesProvider } from 'src/utils/layout/NodesContext';

const { Provider, useLaxCtx } = createContext<undefined>({
  name: 'Form',
  required: true,
});

export function useIsInFormContext() {
  return useLaxCtx() !== ContextNotProvided;
}

/**
 * This helper-context provider is used to provide all the contexts needed for forms to work
 */
export function FormProvider({ children }: React.PropsWithChildren) {
  const hasProcess = useHasProcessProvider();

  return (
    <LayoutsProvider>
      <LayoutSettingsProvider>
        <PageNavigationProvider>
          <DynamicsProvider>
            <RulesProvider>
              <DataModelsProvider>
                <AttachmentsStoreProvider>
                  <AllOptionsStoreProvider>
                    <NodesProvider>
                      <NavigateToNodeProvider>
                        <ValidationProvider>
                          <AttachmentsProvider>
                            <AllOptionsProvider>
                              {hasProcess ? (
                                <ProcessNavigationProvider>
                                  <Provider value={undefined}>{children}</Provider>
                                </ProcessNavigationProvider>
                              ) : (
                                <Provider value={undefined}>{children}</Provider>
                              )}
                            </AllOptionsProvider>
                          </AttachmentsProvider>
                        </ValidationProvider>
                      </NavigateToNodeProvider>
                    </NodesProvider>
                  </AllOptionsStoreProvider>
                </AttachmentsStoreProvider>
              </DataModelsProvider>
            </RulesProvider>
          </DynamicsProvider>
        </PageNavigationProvider>
      </LayoutSettingsProvider>
    </LayoutsProvider>
  );
}
