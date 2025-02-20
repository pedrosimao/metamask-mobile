import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, InteractionManager } from 'react-native';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import { hexToText } from '@metamask/controller-utils';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { getAddressAccountType } from '../../../util/address';
import sanitizeString from '../../../util/string';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { useTheme } from '../../../util/theme';
import { PersonalSignProps } from './types';
import { useNavigation } from '@react-navigation/native';
import createStyles from './styles';
import AppConstants from '../../../core/AppConstants';
import { selectChainId } from '../../../selectors/networkController';
import { store } from '../../../store';
import { getBlockaidMetricsParams } from '../../../util/blockaid';
import { SecurityAlertResponse } from '../BlockaidBanner/BlockaidBanner.types';

/**
 * Component that supports personal_sign
 */
const PersonalSign = ({
  onConfirm,
  onReject,
  messageParams,
  currentPageInformation,
  toggleExpandedMessage,
  showExpandedMessage,
}: PersonalSignProps) => {
  const navigation = useNavigation();
  const [truncateMessage, setTruncateMessage] = useState<boolean>(false);

  const { colors }: any = useTheme();
  const styles = createStyles(colors);

  interface AnalyticsParams {
    account_type?: string;
    dapp_host_name?: string;
    chain_id?: string;
    signature_type?: string;
    [key: string]: string | undefined;
  }

  const getAnalyticsParams = useCallback((): AnalyticsParams => {
    try {
      const chainId = selectChainId(store.getState());
      const pageInfo = currentPageInformation || messageParams.meta;
      const url = new URL(pageInfo.url);

      const blockaidParams = getBlockaidMetricsParams(
        messageParams.securityAlertResponse as SecurityAlertResponse,
      );

      return {
        account_type: getAddressAccountType(messageParams.from),
        dapp_host_name: url?.host,
        chain_id: chainId,
        signature_type: 'personal_sign',
        ...pageInfo?.analytics,
        ...blockaidParams,
      };
    } catch (error) {
      return {};
    }
  }, [currentPageInformation, messageParams]);

  useEffect(() => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGNATURE_REQUESTED,
      getAnalyticsParams(),
    );
  }, [getAnalyticsParams, messageParams.securityAlertResponse]);

  useEffect(() => {
    const onSignatureError = ({ error }: { error: Error }) => {
      if (error?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
          getAnalyticsParams(),
        );
      }
    };
    Engine.context.SignatureController.hub.on(
      `${messageParams.metamaskId}:signError`,
      onSignatureError,
    );
    return () => {
      Engine.context.SignatureController.hub.removeListener(
        `${messageParams.metamaskId}:signError`,
        onSignatureError,
      );
    };
  }, [getAnalyticsParams, messageParams.metamaskId]);

  const showWalletConnectNotification = (confirmation = false) => {
    InteractionManager.runAfterInteractions(() => {
      messageParams.origin &&
        (messageParams.origin.startsWith(WALLET_CONNECT_ORIGIN) ||
          messageParams.origin.startsWith(
            AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
          )) &&
        NotificationManager.showSimpleNotification({
          status: `simple_notification${!confirmation ? '_rejected' : ''}`,
          duration: 5000,
          title: confirmation
            ? strings('notifications.wc_signed_title')
            : strings('notifications.wc_signed_rejected_title'),
          description: strings('notifications.wc_description'),
        });
    });
  };

  const rejectSignature = async () => {
    await onReject();
    showWalletConnectNotification(false);
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGNATURE_REJECTED,
      getAnalyticsParams(),
    );
  };

  const confirmSignature = async () => {
    await onConfirm();
    showWalletConnectNotification(true);
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGNATURE_APPROVED,
      getAnalyticsParams(),
    );
  };

  const shouldTruncateMessage = (e: any) => {
    if (e.nativeEvent.lines.length > 5) {
      setTruncateMessage(true);
      return;
    }
    setTruncateMessage(false);
  };

  const renderMessageText = () => {
    const textChild = sanitizeString(hexToText(messageParams.data))
      .split('\n')
      .map((line: string, i: number) => (
        <Text
          key={`txt_${i}`}
          style={[
            styles.messageText,
            !showExpandedMessage ? styles.textLeft : null,
          ]}
        >
          {line}
          {!showExpandedMessage && '\n'}
        </Text>
      ));
    let messageText;
    if (showExpandedMessage) {
      messageText = textChild;
    } else {
      messageText = truncateMessage ? (
        <Text
          style={styles.messageTextColor}
          numberOfLines={5}
          ellipsizeMode={'tail'}
        >
          {textChild}
        </Text>
      ) : (
        <Text
          style={styles.messageTextColor}
          onTextLayout={shouldTruncateMessage}
        >
          {textChild}
        </Text>
      );
    }
    return messageText;
  };

  const rootView = showExpandedMessage ? (
    <ExpandedMessage
      currentPageInformation={currentPageInformation}
      renderMessage={renderMessageText}
      toggleExpandedMessage={toggleExpandedMessage}
    />
  ) : (
    <SignatureRequest
      navigation={navigation}
      onReject={rejectSignature}
      onConfirm={confirmSignature}
      currentPageInformation={currentPageInformation}
      showExpandedMessage={showExpandedMessage}
      toggleExpandedMessage={toggleExpandedMessage}
      truncateMessage={truncateMessage}
      type="personal_sign"
      fromAddress={messageParams.from}
      securityAlertResponse={messageParams.securityAlertResponse}
      testID={'personal-signature-request'}
    >
      <View style={styles.messageWrapper}>{renderMessageText()}</View>
    </SignatureRequest>
  );
  return rootView;
};

export default PersonalSign;
