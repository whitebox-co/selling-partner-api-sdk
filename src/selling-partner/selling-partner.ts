import { AssumeRoleCommand, Credentials, STSClient } from '@aws-sdk/client-sts'
import { AmazonMarketplace, amazonMarketplacesList } from '@scaleleap/amazon-marketplaces'
import axios from 'axios'
import _ from 'lodash'

import {
  APIConfigurationParameters,
  AplusContentApiClient,
  AuthorizationApiClient,
  CatalogItemsApiClient,
  CatalogItemsApiClientV20201201,
  FbaInboundEligibilityApiClient,
  FbaInventoryApiClient,
  FbaSmallAndLightApiClient,
  FeedsApiClient,
  FeedsApiClientV20210630,
  FinancesApiClient,
  FulfillmentInboundApiClient,
  ListingsItemsApiClient,
  MerchantFulfillmentApiClient,
  MessagingApiClient,
  NotificationsApiClient,
  OrdersApiClient,
  ProductFeesApiClient,
  ProductPricingApiClient,
  ProductTypeDefinitionsApiClient,
  ReportsApiClient,
  ReportsApiClientV20210630,
  SalesApiClient,
  SellersApiClient,
  ServicesApiClient,
  ShipmentInvoicingApiClient,
  ShippingApiClient,
  ShippingApiClientV2,
  SolicitationsApiClient,
  UploadsApiClient,
  VendorDirectFulfillmentInventoryApiClient,
  VendorDirectFulfillmentOrdersApiClient,
  VendorDirectFulfillmentPaymentsApiClient,
  VendorDirectFulfillmentTransactionsApiClient,
  VendorInvoicesApiClient,
  VendorOrdersApiClient,
  VendorShipmentsApiClient,
  VendorTransactionStatusApiClient,
} from '../index'
import {
  VendorDirectFulfillmentShippingCustomerInvoicesApiClient,
  VendorDirectFulfillmentShippingVendorShippingApiClient,
  VendorDirectFulfillmentShippingVendorShippingLabelsApiClient,
} from './vendor-direct-fulfillment-shipping'

/**
 * Union of SellerClients - Helps type guard for .getClient() Distributed Conditional.
 */
declare type SellerClient =
  | AplusContentApiClient
  | CatalogItemsApiClient
  | FbaInboundEligibilityApiClient
  | FbaInventoryApiClient
  | FbaSmallAndLightApiClient
  | FeedsApiClient
  | FeedsApiClientV20210630
  | FinancesApiClient
  | FulfillmentInboundApiClient
  | ListingsItemsApiClient
  | MerchantFulfillmentApiClient
  | MessagingApiClient
  | NotificationsApiClient
  | OrdersApiClient
  | ProductFeesApiClient
  | ProductPricingApiClient
  | ProductTypeDefinitionsApiClient
  | ReportsApiClient
  | ReportsApiClientV20210630
  | SalesApiClient
  | SellersApiClient
  | ServicesApiClient
  | ShipmentInvoicingApiClient
  | ShippingApiClient
  | ShippingApiClientV2
  | SolicitationsApiClient
  | UploadsApiClient

/**
 * Union of VendorClients - Helps type guard for .getClient() Distributed Conditional.
 */
declare type VendorClient =
  | VendorDirectFulfillmentInventoryApiClient
  | VendorDirectFulfillmentPaymentsApiClient
  | VendorDirectFulfillmentShippingCustomerInvoicesApiClient
  | VendorDirectFulfillmentShippingVendorShippingApiClient
  | VendorDirectFulfillmentShippingVendorShippingLabelsApiClient
  | VendorDirectFulfillmentTransactionsApiClient
  | VendorDirectFulfillmentOrdersApiClient
  | VendorInvoicesApiClient
  | VendorOrdersApiClient
  | VendorShipmentsApiClient
  | VendorTransactionStatusApiClient

interface SellingPartnerCredentials {
  clientId: string
  clientSecret: string
  accessKeyId: string
  secretAccessKey: string
  roleArn: string
  lwaRefreshToken?: string
}

interface TokenResponse {
  /* eslint-disable camelcase */
  access_token: string
  expires_in: number
  refresh_token: string
  /* eslint-enable camelcase */
}

type GrantType = 'refresh_token' | 'client_credentials'

/**
 * Grouping of all of the SellerClient Apis.
 * Having these exported groups allows easier intellisense for the seller client apis.
 *
 * @example
 * import { sellerClients } from '@whitebox-co/util';
 * const ordersApiClient = new sellerClients.OrdersApiClient(sellerApiConfig);
 */
export const sellerClients = {
  AplusContentApiClient,
  CatalogItemsApiClientV20201201,
  FbaInboundEligibilityApiClient,
  FbaInventoryApiClient,
  FbaSmallAndLightApiClient,
  FeedsApiClient,
  FeedsApiClientV20210630,
  FinancesApiClient,
  FulfillmentInboundApiClient,
  ListingsItemsApiClient,
  MerchantFulfillmentApiClient,
  MessagingApiClient,
  NotificationsApiClient,
  OrdersApiClient,
  ProductFeesApiClient,
  ProductPricingApiClient,
  ProductTypeDefinitionsApiClient,
  ReportsApiClient,
  ReportsApiClientV20210630,
  SalesApiClient,
  SellersApiClient,
  ServicesApiClient,
  ShipmentInvoicingApiClient,
  ShippingApiClient,
  ShippingApiClientV2,
  SolicitationsApiClient,
  UploadsApiClient,
}

/**
 * Grouping of all of the VendorClient Apis.
 * Having these exported groups allows easier intellisense for the vendor client apis.
 *
 * @example
 * import { vendorClients } from '@whitebox-co/util';
 * const VendorDirectFulfillmentInventoryApiClient = new vendorClients.VendorDirectFulfillmentInventoryApiClient(vendorApiConfig);
 */
export const vendorClients = {
  VendorDirectFulfillmentInventoryApiClient,
  VendorDirectFulfillmentPaymentsApiClient,
  VendorDirectFulfillmentShippingCustomerInvoicesApiClient,
  VendorDirectFulfillmentShippingVendorShippingApiClient,
  VendorDirectFulfillmentShippingVendorShippingLabelsApiClient,
  VendorDirectFulfillmentTransactionsApiClient,
  VendorDirectFulfillmentOrdersApiClient,
  VendorInvoicesApiClient,
  VendorOrdersApiClient,
  VendorShipmentsApiClient,
  VendorTransactionStatusApiClient,
}

/**
 * Grouping of all of the SellingPartner Miscellaneous Apis that are neither seller or vendor.
 * Having these exported groups allows easier intellisense for the misc client apis.
 *
 * @example
 * import { miscClients } from '@whitebox-co/util';
 * const authorizationApiClient = new miscClients.AuthorizationApiClient(apiConfig);
 */
export const miscClients = {
  AuthorizationApiClient,
}

// Amazon expiration is technically 60 mins, but we request a new one 5 minutes earlier at 55 minutes to avoid transit timing errors.
const ACCESS_TOKEN_EXPIRATION_IN_SECONDS = 3300
const ACCESS_TOKEN_EXPIRATION_IN_MS = ACCESS_TOKEN_EXPIRATION_IN_SECONDS * 1000

/**
 * Amazon Selling Partner Util that abstracts away the inner workings of the
 * '@whitebox-co/selling-partner-api-sdk' to expose a simple utility that allows
 * developers to get fully instantiated instances of Selling Partner Apis without
 * having to worry about configuration, authorization and library specifics.
 */
export class SellingPartner {
  /**
   * The marketplace for this particular Selling Partner. If a Selling Partner has more than one marketplace
   * there will need to be more than one instantiated SellingPartner Util.
   */
  marketplace: AmazonMarketplace | undefined

  /**
   * Every Selling Partner can have a seller and/or vendor account per marketplace.
   */
  credentials: {
    seller?: SellingPartnerCredentials
    vendor?: SellingPartnerCredentials
  }

  /**
   * Used as a way to cache the different api configurations so calls to the api are not constant.
   * The key is the request scope of any call as every request scope has different accessKeys and expirations times.
   * Possible Key Options: 'sellingpartnerapi::migration', 'sellingpartnerapi::notifications', 'sellingpartnerapi'.
   */
  configurations: {
    [key: string]: {
      seller?: APIConfigurationParameters
      vendor?: APIConfigurationParameters
    }
  }

  /**
   * Used as a way to cache the different accessToken expiration times.
   * The key is the request scope of any call as every request scope has different accessKeys and expirations times.
   * Possible Key Options: 'sellingpartnerapi::migration', 'sellingpartnerapi::notifications', 'sellingpartnerapi'.
   */
  accessTokenExpirationCache: {
    [key: string]: {
      seller?: Date
      vendor?: Date
    }
  }

  /**
   * @param { seller: SellingPartnerCredentials; vendor: SellingPartnerCredentials } credentials seller and vendor credentials. The seller credentials are a combination of the wb amazon seller iam credentials, wb amazon `seller` application credentials and the refresh token of the client tied to the specific marketplace. The vendor credentials are a combination of the wb amazon vendor iam credentials, wb amazon `vendor` application credentials and the refresh token of the client tied to the specific marketplace. Should have either seller or vendor or both.
   * @param {string} marketplaceId The marketplace id is used to determine the region specific urls for all selling partner requests.
   *
   * @example
   * import { SellingPartner } from '@whitebox-co/util';
   * import { OrdersApiClient } from '@whitebox-co/selling-partner-api-sdk';
   *
   * const sellerCredentials = {
   * 	clientId: 'amzn1...',
   * 	clientSecret: '2fd4d0b...',
   * 	accessKeyId: 'AKIAYGQJ...',
   * 	secretAccessKey: 'RmVAqR...',
   * 	roleArn: 'arn:aws:iam::563734528934:role/SellerPartnerApiRole'',
   * 	lwaRefreshToken: 'Atzr|IwEBIBQ0...'
   * }
   *
   * const vendorCredentials = {
   * 	clientId: 'amzn1...',
   * 	clientSecret: '2fd4d0b...',
   * 	accessKeyId: 'AKIAYGQJ...',
   * 	secretAccessKey: 'RmVAqR...',
   * 	roleArn: 'arn:aws:iam::563734528934:role/SellerPartnerApiRole'',
   * 	lwaRefreshToken: 'Atzr|IwEBIBQ0...'
   * }
   *
   * const credentials = {
   * 	seller: sellerCredentials,
   * 	vendor: vendorCredentials,
   * }
   *
   * const marketplaceId = 'ATVPDKIKX0DER';
   * const sellingPartner = new SellingPartner(credentials, marketplaceId);
   * const orderApiClient = await sellingPartner.getClient(OrdersApiClient);
   * const data = await ordersApiClient.getStuff(); // See scaled leap api for documentation of each api.
   */
  constructor(
    credentials: { seller?: SellingPartnerCredentials; vendor?: SellingPartnerCredentials },
    marketplaceId: string,
  ) {
    this.credentials = credentials
    this.configurations = {}
    this.accessTokenExpirationCache = {}
    this.marketplace = amazonMarketplacesList.find(
      (marketplace) => marketplace.id === marketplaceId,
    )
  }

  /**
   * Generates a fully instantiated and configured ClientApi.
   *
   * @example
   * const sellingPartner = new SellingPartner(credentials, marketplaceId);
   * const orderApiClient = await sellingPartner.getClient(OrdersApiClient);
   *
   * @param Client SellerClient | VendorClient | AuthorizationApiClient
   * - Should be one of the many ClientApis from '@whitebox-co/selling-partner-api-sdk'
   * - This should be the Class itself and not an instance.
   *
   * @returns {Promise<T>} A fully instantiated ClientApi from  '@whitebox-co/selling-partner-api-sdk'
   */
  public async getClient<T extends SellerClient | VendorClient | AuthorizationApiClient>(
    Client: new (config: APIConfigurationParameters) => T,
  ): Promise<T> {
    // Grantless operations require different scopes and grantTypes.
    const scope =
      Client.name === 'NotificationsApiClient'
        ? 'sellingpartnerapi::notifications'
        : 'sellingpartnerapi'
    const grantType: GrantType =
      Client.name === 'NotificationApiClient' ? 'client_credentials' : 'refresh_token'

    // Authorize and generate api configs.
    const configurations = await this.authorize(grantType, scope)

    // Determine if this is a seller or vendor type.
    if (sellerClients[Client.name] && configurations?.seller) {
      return new Client(configurations.seller)
    }
    if (vendorClients[Client.name] && configurations?.vendor) {
      return new Client(configurations.vendor)
    }
    throw new Error(
      `A client for ${Client.name} cannot be instantiated. Please check that this is a valid client, and that the credentials are correct.`,
    )
  }

  /**
   * Generates a fully instantiated and configured AuthorizationApiClient.
   *
   * @example
   * const sellingPartner = new SellingPartner(credentials, marketplaceId);
   * const orderApiClient = await sellingPartner.getAuthClient(config, );
   *
   * @param {string} sellingPartnerType The type of the selling partner. // 'seller' or 'vendor'
   *
   * @returns {Promise<T>} A fully instantiated AuthorizationClientApi from '@scaleleap/ selling-partner-api-sdk'
   */
  public async getAuthClient(sellingPartnerType: string): Promise<AuthorizationApiClient> {
    // Authorize and generate api configs.
    // AuthorizationApiClient is a grantless operation and requires different scopes and grantTypes.
    const configurations = await this.authorize(
      'client_credentials',
      'sellingpartnerapi::migration',
    )

    // Determine if this is a seller or vendor type.
    const configuration =
      sellingPartnerType === 'vendor' ? configurations.vendor : configurations.seller

    // The credentials will exist at this point.
    return new AuthorizationApiClient(configuration as APIConfigurationParameters)
  }

  /**
   * Gets a token from the amazon token api.
   * https://api.amazon.com/auth/o2/token
   *
   * @param {SellingPartnerCredentials} credentials
   * @param {string} grantType The grant type determines token types. Options are 'refresh_token', 'client_credentials'.
   * @param {string} scope The scope is used to tell amazon the domain of the authorization.
   * 			Options are 'sellingpartnerapi::migration', 'sellingpartnerapi::notifications', 'sellingpartnerapi'.
   *
   * @returns {Promise<TokenResponse>}
   */
  private getToken = async (
    credentials: SellingPartnerCredentials,
    grantType: string,
    scope?: string,
  ): Promise<TokenResponse> => {
    const { data: token } = await axios.post<TokenResponse>(
      'https://api.amazon.com/auth/o2/token',
      {
        grant_type: grantType,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.lwaRefreshToken,
        grantType,
        scope,
      },
    )

    return token
  }

  /**
   * Gets Role credentials from the Amazon Security Token Service (STS)
   * https://docs.aws.amazon.com/STS/latest/APIReference/welcome.html
   *
   * Uses ScaleLeap Apis in order to retrieve credentials.
   *
   * @param {SellingPartnerCredentials} credentials
   * @returns {Promise<Credentials>}
   */
  private getRoleCredentials = async (
    credentials: SellingPartnerCredentials,
  ): Promise<Credentials> => {
    const region = this.marketplace?.sellingPartner?.region?.awsRegion || 'us-east-1'

    const sts = new STSClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    })

    const { Credentials: stsCredentials } = await sts.send(
      new AssumeRoleCommand({
        RoleArn: credentials.roleArn,
        RoleSessionName: 'selling-partner-api-axios',
      }),
    )

    return stsCredentials as Credentials
  }

  /**
   * Authorizes the credentials via amazon and generates `APIConfigurationParameters` by:
   *
   * 	1. Getting an access_token from Amazon Token API.
   * 	2. Getting Role Credentials from Amazon Security Token Service (STS)
   *
   * @param {SellingPartnerCredentials} credentials
   * @param {string} grantType The grant type determines token types. Options are 'refresh_token', 'client_credentials'.
   * @param {string} scope The scope is used to tell amazon the domain of the authorization.
   * 		Options are 'sellingpartnerapi::migration', 'sellingpartnerapi::notifications', 'sellingpartnerapi'.
   *
   * @returns {Promise<APIConfigurationParameters>}
   */
  private getApiConfiguration = async (
    credentials: SellingPartnerCredentials,
    grantType: string,
    scope: string,
  ): Promise<APIConfigurationParameters> => {
    const accessToken = await this.getToken(credentials, grantType, scope)
    const roleCredentials = await this.getRoleCredentials(credentials)

    const region = this.marketplace?.sellingPartner?.region?.awsRegion || 'us-east-1'
    const basePath =
      this.marketplace?.sellingPartner?.region?.endpoint ||
      'https://sellingpartnerapi-na.amazon.com'

    return {
      basePath,
      region,
      accessToken: accessToken.access_token,
      credentials: {
        accessKeyId: roleCredentials?.AccessKeyId || '',
        secretAccessKey: roleCredentials?.SecretAccessKey || '',
        sessionToken: roleCredentials?.SessionToken || '',
      },
    }
  }

  /**
   * Simple utility to determine if a credential is valid. Necessary for non TS based code.
   *
   * @param {SellingPartnerCredentials} credential
   * @param {string} grantType The grant type determines token types. Options are 'refresh_token', 'client_credentials'.
   * @returns {boolean | string} validation result
   */
  private validateCredential = (
    credential: SellingPartnerCredentials | undefined | null,
    grantType: GrantType,
  ): boolean => {
    const requiresToken = grantType === 'refresh_token'
    const validToken = requiresToken ? !_.isNil(credential?.lwaRefreshToken) : true

    return Boolean(
      validToken &&
        credential?.clientId &&
        credential?.accessKeyId &&
        credential?.clientSecret &&
        credential?.secretAccessKey &&
        credential?.roleArn,
    )
  }

  /**
   * Authorizes both seller and vendor central accounts associated with the marketplace.
   *
   * @param {string} grantType The grant type determines token types. Options are 'refresh_token', 'client_credentials'.
   * @param {string} scope The scope is used to tell amazon the domain of the authorization, Options are 'sellingpartnerapi::migration', 'sellingpartnerapi::migration'.
   *
   * @returns {{seller: APIConfigurationParameters, vendor: APIConfigurationParameters}}
   */
  private authorize = async (
    grantType: GrantType,
    scope: string,
  ): Promise<{ seller?: APIConfigurationParameters; vendor?: APIConfigurationParameters }> => {
    let configurations = this.configurations[scope]
    const expirations = this.accessTokenExpirationCache[scope]
    const now = new Date()
    const sellerTokenHasExpired = configurations && expirations?.seller && now >= expirations.seller
    const vendorTokenHasExpired = configurations && expirations?.vendor && now >= expirations.vendor
    const hasValidSellerCredentials = this.validateCredential(this.credentials.seller, grantType)
    const hasValidVendorCredentials = this.validateCredential(this.credentials.vendor, grantType)

    if (!configurations) {
      configurations = {}
      this.configurations[scope] = configurations
      this.accessTokenExpirationCache[scope] = {}
    }

    if ((!configurations.seller && hasValidSellerCredentials) || sellerTokenHasExpired) {
      this.configurations[scope].seller = await this.getApiConfiguration(
        this.credentials.seller as SellingPartnerCredentials,
        grantType,
        scope,
      )
      this.accessTokenExpirationCache[scope].seller = new Date(
        Date.now() + ACCESS_TOKEN_EXPIRATION_IN_MS,
      )
    }

    if ((!configurations.vendor && hasValidVendorCredentials) || vendorTokenHasExpired) {
      this.configurations[scope].vendor = await this.getApiConfiguration(
        this.credentials.vendor as SellingPartnerCredentials,
        grantType,
        scope,
      )
      this.accessTokenExpirationCache[scope].vendor = new Date(
        Date.now() + ACCESS_TOKEN_EXPIRATION_IN_MS,
      )
    }

    return this.configurations[scope]
  }
}
