import React from 'react';
import { View } from 'react-native-animatable';

import { captureException } from '@sentry/react-native';

import { strings } from '../../../../locales/i18n';
import { AccordionHeaderHorizontalAlignment } from '../../../component-library/components/Accordions/Accordion';
import Accordion from '../../../component-library/components/Accordions/Accordion/Accordion';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Icon from '../../../component-library/components/Icons/Icon/Icon';
import Text from '../../../component-library/components/Texts/Text/Text';
import { useStyles } from '../../../component-library/hooks/useStyles';
import { isBlockaidFeatureEnabled } from '../../../util/blockaid';
import {
  ATTRIBUTION_LINE_TEST_ID,
  FALSE_POSITIVE_REPOST_LINE_TEST_ID,
  REASON_DESCRIPTION_I18N_KEY_MAP,
  REASON_TITLE_I18N_KEY_MAP,
} from './BlockaidBanner.constants';
import styleSheet from './BlockaidBanner.styles';
import {
  BlockaidBannerProps,
  Reason,
  ResultType,
} from './BlockaidBanner.types';
import BlockaidBannerLink from './BlockaidBannerLink';
import {
  BLOCKAID_ATTRIBUTION_LINK,
  BLOCKAID_SUPPORT_LINK,
} from '../../../constants/urls';

const getTitle = (reason: Reason): string =>
  strings(
    REASON_TITLE_I18N_KEY_MAP[reason] ||
      'blockaid_banner.deceptive_request_title',
  );

const getDescription = (reason: Reason) =>
  strings(
    REASON_DESCRIPTION_I18N_KEY_MAP[reason] ||
      REASON_DESCRIPTION_I18N_KEY_MAP[Reason.other],
  );

const BlockaidBanner = (bannerProps: BlockaidBannerProps) => {
  const {
    style,
    securityAlertResponse,
    onToggleShowDetails,
    onContactUsClicked,
  } = bannerProps;
  const { styles } = useStyles(styleSheet, { style });

  if (!securityAlertResponse || !isBlockaidFeatureEnabled()) {
    return null;
  }

  const { resultType, reason, features } = securityAlertResponse;

  if (resultType === ResultType.Benign) {
    return null;
  }

  const title = getTitle(reason);
  const description = getDescription(reason);

  if (resultType === ResultType.Failed) {
    return (
      <BannerAlert
        severity={BannerAlertSeverity.Warning}
        title={title}
        description={description}
      />
    );
  }

  if (!REASON_DESCRIPTION_I18N_KEY_MAP[reason]) {
    captureException(`BlockaidBannerAlert: Unidentified reason '${reason}'`);
  }

  const renderDetails = () =>
    features?.length <= 0 ? null : (
      <Accordion
        title={strings('blockaid_banner.see_details')}
        onPress={onToggleShowDetails}
        isExpanded={false}
        horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
      >
        <View style={styles.details}>
          {features?.map((feature, i) => (
            <Text key={`feature-${i}`} style={styles.detailsItem}>
              • {feature}
            </Text>
          ))}
        </View>
        <View style={styles.attributionBase}>
          <View style={styles.attributionItem}>
            <Text
              variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
              data-testid={FALSE_POSITIVE_REPOST_LINE_TEST_ID}
            >
              {strings('blockaid_banner.does_not_look_right')}
            </Text>
          </View>
          <View style={styles.attributionItem}>
            <BlockaidBannerLink
              text={strings('app_information.contact_us')}
              link={BLOCKAID_SUPPORT_LINK}
              onContactUsClicked={onContactUsClicked}
            />
          </View>
        </View>
      </Accordion>
    );

  return (
    <BannerAlert
      severity={
        resultType === ResultType.Malicious
          ? BannerAlertSeverity.Error
          : BannerAlertSeverity.Warning
      }
      title={title}
      description={description}
      {...bannerProps}
    >
      {renderDetails()}

      <View style={styles.attributionBase}>
        <View style={styles.attributionItem}>
          <Icon
            name={IconName.SecurityTick}
            size={IconSize.Sm}
            color={IconColor.Primary}
            style={styles.securityTickIcon}
          />
        </View>
        <View style={styles.attributionItem}>
          <Text
            variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
            data-testid={ATTRIBUTION_LINE_TEST_ID}
          >
            {strings('blockaid_banner.attribution')}
          </Text>
        </View>
        <View style={styles.attributionItem}>
          <BlockaidBannerLink
            text={strings('blockaid_banner.attribution_link_name')}
            link={BLOCKAID_ATTRIBUTION_LINK}
          />
        </View>
      </View>
    </BannerAlert>
  );
};

export default BlockaidBanner;
