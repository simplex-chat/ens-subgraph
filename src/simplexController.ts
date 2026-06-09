// SNRC-specific event handlers for the SimplexController contract.
//
// SimplexController is a fork of upstream's ETHRegistrarController. The
// `NameRegistered` and `NameRenewed` events carry an extra `bytes32 referrer`
// parameter; otherwise the shape matches upstream's UnwrappedEthRegistrarController.
// We currently drop the referrer when indexing — if the frontend later wants
// referral analytics, add a `referrer: Bytes!` column to `Registration` in
// schema.graphql and thread `event.params.referrer` through here.
//
// The domain-lookup + naming logic is shared with the upstream
// BaseRegistrar handlers via `setNamePreimage` in ethRegistrar.ts so we
// don't carry two copies of the `keccak256(parent ++ label)` + Domain.load
// dance.

import { setNamePreimage } from "./ethRegistrar";
import {
  NameRegistered as SimplexController_NameRegistered,
  NameRenewed as SimplexController_NameRenewed,
} from "./types/SimplexController/SimplexController";

export function handleNameRegisteredBySimplexController(
  event: SimplexController_NameRegistered
): void {
  setNamePreimage(
    event.params.label,
    event.params.labelhash,
    event.params.baseCost.plus(event.params.premium)
  );
}

export function handleNameRenewedBySimplexController(
  event: SimplexController_NameRenewed
): void {
  setNamePreimage(event.params.label, event.params.labelhash, event.params.cost);
}
