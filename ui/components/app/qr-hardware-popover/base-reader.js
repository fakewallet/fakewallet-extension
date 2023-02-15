import React, { useEffect, useRef, useState } from 'react';
import log from 'loglevel';
import { URDecoder } from '@ngraveio/bc-ur';
import PropTypes from 'prop-types';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { ENVIRONMENT_TYPE_FULLSCREEN } from '../../../../shared/constants/app';
import WebcamUtils from '../../../helpers/utils/webcam-utils';
import PageContainerFooter from '../../ui/page-container/page-container-footer/page-container-footer.component';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { SECOND } from '../../../../shared/constants/time';
import EnhancedReader from './enhanced-reader';

const READY_STATE = {
  ACCESSING_CAMERA: 'ACCESSING_CAMERA',
  NEED_TO_ALLOW_ACCESS: 'NEED_TO_ALLOW_ACCESS',
  READY: 'READY',
};

const BaseReader = ({
  isReadingWallet,
  handleCancel,
  handleSuccess,
  setErrorTitle,
}) => {
  const t = useI18nContext();
  const [ready, setReady] = useState(READY_STATE.ACCESSING_CAMERA);
  const [error, setError] = useState(null);
  const [urDecoder, setURDecoder] = useState(new URDecoder());

  let permissionChecker = null;
  const mounted = useRef(false);

  const reset = () => {
    setReady(READY_STATE.ACCESSING_CAMERA);
    setError(null);
    setURDecoder(new URDecoder());
  };

  const checkEnvironment = async () => {
    try {
      const { environmentReady } = await WebcamUtils.checkStatus();
      if (
        !environmentReady &&
        getEnvironmentType() !== ENVIRONMENT_TYPE_FULLSCREEN
      ) {
        const currentUrl = new URL(window.location.href);
        const currentHash = currentUrl.hash;
        const currentRoute = currentHash ? currentHash.substring(1) : null;
        global.platform.openExtensionInBrowser(currentRoute);
      }
    } catch (e) {
      if (mounted.current) {
        setError(e);
      }
    }
    // initial attempt is required to trigger permission prompt
    // eslint-disable-next-line no-use-before-define
    return initCamera();
  };

  const checkPermissions = async () => {
    try {
      const { permissions } = await WebcamUtils.checkStatus();
      if (permissions) {
        // Let the video stream load first...
        await new Promise((resolve) => setTimeout(resolve, SECOND * 2));
        if (!mounted.current) {
          return;
        }
        setReady(READY_STATE.READY);
      } else if (mounted.current) {
        // Keep checking for permissions
        permissionChecker = setTimeout(checkPermissions, SECOND);
        setReady(READY_STATE.NEED_TO_ALLOW_ACCESS);
      }
    } catch (e) {
      if (mounted.current) {
        setError(e);
      }
    }
  };

  const handleScan = (data) => {
    try {
      if (!data) {
        return;
      }
      urDecoder.receivePart(data);
      if (urDecoder.isComplete()) {
        const result = urDecoder.resultUR();
        handleSuccess(result).catch(setError);
      }
    } catch (e) {
      if (isReadingWallet) {
        setErrorTitle(t('QRHardwareUnknownQRCodeTitle'));
      } else {
        setErrorTitle(t('QRHardwareInvalidTransactionTitle'));
      }
      setError(new Error(t('unknownQrCode')));
    }
  };

  const initCamera = () => {
    try {
      checkPermissions();
    } catch (e) {
      if (!mounted.current) {
        return;
      }
      if (e.name === 'NotAllowedError') {
        log.info(`Permission denied: '${e}'`);
        setReady(READY_STATE.NEED_TO_ALLOW_ACCESS);
      } else {
        setError(e);
      }
    }
  };

  useEffect(() => {
    mounted.current = true;
    checkEnvironment();
    return () => {
      mounted.current = false;
      clearTimeout(permissionChecker);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready === READY_STATE.READY) {
      initCamera();
    } else if (ready === READY_STATE.NEED_TO_ALLOW_ACCESS) {
      checkPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const tryAgain = () => {
    clearTimeout(permissionChecker);
    reset();
    checkEnvironment();
  };

  const renderError = () => {
    let title, msg;
    if (error.type === 'NO_WEBCAM_FOUND') {
      title = t('noWebcamFoundTitle');
      msg = t('noWebcamFound');
    } else if (error.message === t('unknownQrCode')) {
      if (isReadingWallet) {
        msg = t('QRHardwareUnknownWalletQRCode');
      } else {
        msg = t('unknownQrCode');
      }
    } else if (error.message === t('QRHardwareMismatchedSignId')) {
      msg = t('QRHardwareMismatchedSignId');
    } else {
      title = t('unknownCameraErrorTitle');
      msg = t('unknownCameraError');
    }

    return (
      <>
        <div className="qr-scanner__image">
          <img src="images/webcam.svg" width="70" height="70" alt="" />
        </div>
        {title ? <div className="qr-scanner__title">{title}</div> : null}
        <div className="qr-scanner__error">{msg}</div>
        <PageContainerFooter
          onCancel={() => {
            setErrorTitle('');
            handleCancel();
          }}
          onSubmit={() => {
            setErrorTitle('');
            tryAgain();
          }}
          cancelText={t('cancel')}
          submitText={t('tryAgain')}
          submitButtonType="confirm"
        />
      </>
    );
  };

  const renderVideo = () => {
    let message;
    if (false) {
      message = t('accessingYourCamera');
    } else if (ready === READY_STATE.READY) {
      message = t('QRHardwareScanInstructions');
    } else if (ready === READY_STATE.NEED_TO_ALLOW_ACCESS) {
      message = t('youNeedToAllowCameraAccess');
    }
    const ref = useRef(null);
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingBottom:'10px'}}>
        <div className="qr-scanner__content">
          <EnhancedReader handleScan={handleScan} />
        </div>
        {message && <div className="qr-scanner__status">{message}</div>}
        <input className="new-account-create-form__input" style={{marginBottom: '10px'}} autoFocus ref={ref} placeholder={'or paste here'} />
        <button className="button btn-primary btn--rounded new-account-create-form__button" type="primary" onClick={() => { try { handleSuccess(URDecoder.decode(ref.current.value)) } catch { if (isReadingWallet) { setErrorTitle(t('QRHardwareUnknownQRCodeTitle')); } else { setErrorTitle(t('QRHardwareInvalidTransactionTitle')); } setError(new Error(t('unknownQrCode'))); } }}>submit</button>
      </div>
    );
  };

  return (
    <div className="qr-scanner">{renderVideo()}</div>
  );
};

BaseReader.propTypes = {
  isReadingWallet: PropTypes.bool.isRequired,
  handleCancel: PropTypes.func.isRequired,
  handleSuccess: PropTypes.func.isRequired,
  setErrorTitle: PropTypes.func.isRequired,
};

export default BaseReader;
