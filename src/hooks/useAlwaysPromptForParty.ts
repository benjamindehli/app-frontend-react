import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useParties } from 'src/features/party/PartiesProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useInstanceIdParams } from 'src/hooks/useInstanceIdParams';

export function useAlwaysPromptForParty(): boolean | null {
  const { partyId: partyIdFromUrl } = useInstanceIdParams();
  const applicationMetadata = useApplicationMetadata();
  const profile = useProfile();
  const parties = useParties();

  if (!profile?.partyId || !parties) {
    return null;
  }

  if (applicationMetadata?.promptForParty === 'never') {
    return false;
  }

  if (applicationMetadata?.promptForParty === 'always') {
    return true;
  }

  // No point in prompting if there is only one party
  if (parties.length === 1) {
    return false;
  }

  return !partyIdFromUrl && !profile.profileSettingPreference.doNotPromptForParty;
}
