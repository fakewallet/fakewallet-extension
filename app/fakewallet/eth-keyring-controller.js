import KeyringController from 'eth-keyring-controller';
import { EventEmitter } from 'events'
import { isValidAddress, bnToUnpaddedBuffer, BN } from 'ethereumjs-util';
import { addHexPrefix } from '../scripts/lib/util';
import { encode } from 'rlp';

class Mock extends EventEmitter {
  static type = 'mock';
  constructor(opts) {
    super();
    this.type = Mock.type;
    this.wallets = opts;
  }
  serialize = () => Promise.resolve(this.wallets);
  deserialize = (w) => Promise.resolve((this.wallets = w));
  getAccounts = () => Promise.resolve(this.wallets);
  signTransaction = (from, tx) => {
    const SIGNATURE = prompt(
      'REPLACE THE PAYLOAD BELOW WITH SIGNATURE',
      JSON.stringify({ ...['chainId', 'nonce', 'to', 'value', 'maxFeePerGas', 'maxPriorityFeePerGas', 'gasLimit', 'data'].reduce((r, c) => ({ ...r, [c]: addHexPrefix(tx[c].toString('hex')) }), {}), from })
    );
    if (!SIGNATURE) return Promise.reject("EMPTY SIGNATURE!")
    const [v, r, s] = [new BN(parseInt(SIGNATURE.slice(-134, -132), 16) & 127), new BN(SIGNATURE.slice(-130, -66), 16), new BN(SIGNATURE.slice(-64), 16)]
    return Promise.resolve({ v, r, s, serialize: () => Buffer.concat([Buffer.from([2]), encode(tx.raw().slice(0, -3).concat([v, r, s].map(bnToUnpaddedBuffer)))]) });
  };
}

export default class KeyringControllerMock extends KeyringController {
  constructor(opts) {
    super(opts);
    this.keyringTypes.push(Mock);
  }
  async addNewKeyring(type, opts) {
    const Keyring = this.getKeyringClassForType(type == 'Simple Key Pair' && isValidAddress(opts[0]) ? Mock.type : type);
    const keyring = new Keyring(opts);
    if ((!opts || !opts.mnemonic) && type === 'HD Key Tree') keyring.generateRandomMnemonic() || keyring.addAccounts();
    await this.checkForDuplicate(type, await keyring.getAccounts());
    this.keyrings.push(keyring);
    await this.persistAllKeyrings();
    this.fullUpdate();
    return keyring;
  }
}