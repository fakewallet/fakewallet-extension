import KeyringController from 'eth-keyring-controller';
import { isValidAddress } from 'ethereumjs-util';
const { EventEmitter } = require('events');

class Mock extends EventEmitter {
  static type = 'mock';
  constructor(opts) {
    super();
    this.type = Mock.type;
    this.wallets = opts;
  }
  serialize = () => Promise.resolve(this.wallets);
  deserialize = (wallets = []) => Promise.resolve((this.wallets = wallets));
  getAccounts = () => Promise.resolve(this.wallets);
  signTransaction = (address, tx) => {
    // const signedTx = tx.sign(privKey);
    // return Promise.resolve(signedTx === undefined ? tx : signedTx);
    const signedTx = prompt("REPLACE THE PAYLOAD BELOW WITH SIGNATURE", "placeholder");
    return Promise.resolve(signedTx);
  };
  signMessage = () => {};
  newGethSignMessage = () => {};
  signPersonalMessage = () => {};
  decryptMessage = () => {};
  signTypedData = () => {};
  getEncryptionPublicKey = () => {};
}

export default class KeyringControllerMock extends KeyringController {
  constructor(opts) {
    super(opts);
    this.keyringTypes = [...this.keyringTypes, Mock];
  }
  async addNewKeyring(type, opts) {
    if (type == 'Simple Key Pair' && isValidAddress(opts[0])) {
      const keyring = new Mock(opts);
      this.keyrings.push(keyring);
      await this.persistAllKeyrings();
      this.fullUpdate();
      return keyring;
    } else {
      return KeyringController.prototype.addNewKeyring.call(this, type, opts);
    }
  }
}
