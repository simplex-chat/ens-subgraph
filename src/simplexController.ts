// SNRC-specific event handlers for the SimplexController contract.
//
// SimplexController is a fork of upstream's ETHRegistrarController. The
// `NameRegistered` and `NameRenewed` events carry an extra `bytes32 referrer`
// parameter; otherwise the shape matches upstream's UnwrappedEthRegistrarController.
// We currently drop the referrer when indexing — if the frontend later wants
// referral analytics, add a `referrer: Bytes!` column to `Registration` in
// schema.graphql and thread `event.params.referrer` through here.

import { BigInt, ByteArray, Bytes, crypto } from "@graphprotocol/graph-ts";

import { Domain, Registration } from "./types/schema";
import {
  NameRegistered as SimplexController_NameRegistered,
  NameRenewed as SimplexController_NameRenewed,
} from "./types/SimplexController/SimplexController";

import { checkValidLabel, concat } from "./utils";

// namehash("testing") — TLD root for the SNRC mainnet .testing deployment.
// Must match SimplexController's on-chain `tldNode`. If we deploy a second
// TLD (e.g. .simplex) we'd add another constant and dispatch off the labelhash's
// parent.
const TESTING_NODE: ByteArray = ByteArray.fromHexString(
  "0x28e7c59272dc97327b924be290951e94fb52c2e795a3f5c2bb69198f33bb0758"
);

function setNamePreimage(name: string, label: Bytes, cost: BigInt): void {
  if (!checkValidLabel(name)) return;

  const domainId = crypto.keccak256(concat(TESTING_NODE, label)).toHex();
  const domain = Domain.load(domainId);
  if (domain === null) return;

  if (domain.labelName !== name) {
    domain.labelName = name;
    domain.name = name + ".testing";
    domain.save();
  }

  const registration = Registration.load(label.toHex());
  if (registration == null) return;
  registration.labelName = name;
  registration.cost = cost;
  registration.save();
}

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
