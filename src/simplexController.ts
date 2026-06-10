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

import { ByteArray, Bytes, crypto } from "@graphprotocol/graph-ts";

import { setNamePreimage } from "./ethRegistrar";
import {
  NameRegistered as SimplexController_NameRegistered,
  NameRenewed as SimplexController_NameRenewed,
  ReservedNameAdded as SimplexController_ReservedNameAdded,
  ReservedNameRemoved as SimplexController_ReservedNameRemoved,
} from "./types/SimplexController/SimplexController";
import { ReservedName } from "./types/schema";

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

// Reserved names carry their plaintext label in the event but are reserved
// *before* the registry node exists, so we can't call setNamePreimage here
// (it asserts the Domain is already present). Instead we persist the
// labelhash -> label preimage; ethRegistrar.handleNameRegistered consults it
// when the rainbow table misses, so reserved names registered directly via
// the BaseRegistrar still resolve to their label.
export function handleReservedNameAdded(
  event: SimplexController_ReservedNameAdded
): void {
  let name = event.params.name;
  let labelhash = crypto.keccak256(ByteArray.fromUTF8(name));
  let id = labelhash.toHexString();
  let reserved = ReservedName.load(id);
  if (reserved == null) {
    reserved = new ReservedName(id);
    reserved.reservedAtBlock = event.block.number;
  }
  reserved.labelhash = Bytes.fromByteArray(labelhash);
  reserved.name = name;
  reserved.active = true;
  reserved.save();
}

export function handleReservedNameRemoved(
  event: SimplexController_ReservedNameRemoved
): void {
  let id = crypto.keccak256(ByteArray.fromUTF8(event.params.name)).toHexString();
  let reserved = ReservedName.load(id);
  if (reserved != null) {
    // Keep the preimage so already-registered names still resolve; just
    // flag the reservation as no longer active.
    reserved.active = false;
    reserved.save();
  }
}
