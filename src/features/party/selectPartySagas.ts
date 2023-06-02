import { call, put } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { PartyActions } from 'src/features/party/partySlice';
import { putWithoutConfig } from 'src/utils/network/networking';
import { updateCookieUrl } from 'src/utils/urls/appUrlHelper';
import type { ISelectParty } from 'src/features/party/index';

export function* selectPartySaga({ payload: { party, redirect } }: PayloadAction<ISelectParty>): SagaIterator {
  try {
    const url: string = updateCookieUrl(party.partyId);
    yield call(putWithoutConfig, url);
    yield put(PartyActions.selectPartyFulfilled({ party }));
    if (redirect) {
      const { org, app } = window;
      window.location.replace(`${window.location.origin}/${org}/${app}#/`);
    }
  } catch (error) {
    yield put(PartyActions.selectPartyRejected({ error }));
  }
}
