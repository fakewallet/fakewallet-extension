import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as actions from '../../ui/store/actions';
import { getMetaMaskAccounts } from '../../ui/selectors';
import Button from '../../ui/components/ui/button';
import { getMostRecentOverviewPage } from '../../ui/ducks/history/history';

class PrivateKeyImportView extends Component {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    importNewAccount: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    displayWarning: PropTypes.func.isRequired,
    setSelectedAddress: PropTypes.func.isRequired,
    firstAddress: PropTypes.string.isRequired,
    error: PropTypes.node,
    mostRecentOverviewPage: PropTypes.string.isRequired,
  };

  inputRef = React.createRef();

  state = { isEmpty: true };

  createNewKeychain() {
    const address = this.inputRef.current.value;
    const { importNewAccount, history, mostRecentOverviewPage } = this.props;
    importNewAccount('Address', [address]).then(() =>
      history.push(mostRecentOverviewPage),
    );
  }

  createKeyringOnEnter = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.createNewKeychain();
    }
  };

  checkInputEmpty() {
    this.setState({ isEmpty: this.inputRef.current.value == '' });
  }

  render() {
    const { error, displayWarning } = this.props;

    return (
      <div className="new-account-import-form__private-key">
        <span className="new-account-import-form__instruction">Address:</span>
        <div className="new-account-import-form__private-key-password-container">
          <input
            className="new-account-import-form__input-password"
            id="private-key-box"
            onKeyPress={(e) => this.createKeyringOnEnter(e)}
            onChange={() => this.checkInputEmpty()}
            ref={this.inputRef}
            autoFocus
          />
        </div>
        <div className="new-account-import-form__buttons">
          <Button
            type="secondary"
            large
            className="new-account-create-form__button"
            onClick={() => {
              const { history, mostRecentOverviewPage } = this.props;
              displayWarning(null);
              history.push(mostRecentOverviewPage);
            }}
          >
            {this.context.t('cancel')}
          </Button>
          <Button
            type="primary"
            large
            className="new-account-create-form__button"
            onClick={() => this.createNewKeychain()}
            disabled={this.state.isEmpty}
          >
            {this.context.t('import')}
          </Button>
        </div>
        {error ? <span className="error">{error}</span> : null}
      </div>
    );
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(PrivateKeyImportView);

function mapStateToProps(state) {
  return {
    error: state.appState.warning,
    firstAddress: Object.keys(getMetaMaskAccounts(state))[0],
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    importNewAccount: (strategy, [address]) =>
      dispatch(actions.importNewAccount(strategy, [address])),
    displayWarning: (message) =>
      dispatch(actions.displayWarning(message || null)),
    setSelectedAddress: (address) =>
      dispatch(actions.setSelectedAddress(address)),
  };
}
