import axios from 'axios'

import {
  APIConfigurationParameters,
  AuthorizationApiClient,
  OrdersApiClient,
  VendorDirectFulfillmentInventoryApiClient,
  VendorDirectFulfillmentOrdersApiClient,
} from '../../src/index'
import { SellingPartner } from '../../src/selling-partner/selling-partner'
import {
  VendorDirectFulfillmentShippingCustomerInvoicesApiClient,
  VendorDirectFulfillmentShippingVendorShippingApiClient,
  VendorDirectFulfillmentShippingVendorShippingLabelsApiClient,
} from '../../src/selling-partner/vendor-direct-fulfillment-shipping'

jest.mock('@aws-sdk/client-sts', () => ({
  STSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  AssumeRoleCommand: jest.fn().mockResolvedValue({}),
}))

const sellerCredentials = {
  clientId: 'clientId_1234',
  clientSecret: 'clientSecret_1234',
  accessKeyId: 'accessKeyId_1233',
  secretAccessKey: 'secretAccessKey_1234',
  roleArn: 'roleArn_1234',
  lwaRefreshToken: 'lwaRefreshToken_1234',
}

const vendorCredentials = {
  clientId: 'clientId_1234',
  clientSecret: 'clientSecret_1234',
  accessKeyId: 'accessKeyId_1233',
  secretAccessKey: 'secretAccessKey_1234',
  roleArn: 'roleArn_1234',
  lwaRefreshToken: 'lwaRefreshToken_1234',
}

const marketplaceId = 'ATVPDKIKX0DER'

const apiConfigErrorMessage =
  'Amazon Selling Partner credentials were invalid. Please try your API request again with valid credentials.'

describe('selling Partner', () => {
  let sp: SellingPartner
  let sellerApiConfiguration: APIConfigurationParameters
  let vendorApiConfiguration: APIConfigurationParameters
  let config: { vendor: APIConfigurationParameters; seller: APIConfigurationParameters }

  const sellingPartnerBasePath = 'https://sellingpartnerapi-na.amazon.com'

  beforeEach(() => {
    const credentials = {
      seller: sellerCredentials,
      vendor: vendorCredentials,
    }
    sp = new SellingPartner(credentials, marketplaceId)

    sellerApiConfiguration = {
      basePath: 'https://sellingpartnerapi-na.amazon.com/seller',
      region: 'us-east-1',
      accessToken: 'my_token',
      credentials: {
        accessKeyId: '',
        secretAccessKey: '',
        sessionToken: '',
      },
    }

    vendorApiConfiguration = {
      basePath: 'https://sellingpartnerapi-na.amazon.com/vendor',
      region: 'us-east-1',
      accessToken: 'my_token',
      credentials: {
        accessKeyId: '',
        secretAccessKey: '',
        sessionToken: '',
      },
    }

    config = {
      seller: sellerApiConfiguration,
      vendor: vendorApiConfiguration,
    }
  })

  // We differentiate private vs public because private functions need to be ran through public functions
  // and mocked on a case by case basis to properly achieve necessary coverage.
  describe('private', () => {
    describe('#getToken', () => {
      it('should return a token from amazon auth', async () => {
        expect.assertions(2)

        jest.spyOn<any, any>(sp, 'getRoleCredentials').mockResolvedValue({
          AccessKeyId: '',
          SecretAccessKey: '',
          SessionToken: '',
          Expiration: new Date('05/24/21'),
        })

        jest.spyOn<any, any>(axios, 'post').mockResolvedValue({
          data: { access_token: 'my_token' },
        })

        const client = await sp.getClient(OrdersApiClient)

        expect(client).toBeInstanceOf(OrdersApiClient)

        expect(sp.configurations.sellingpartnerapi.seller).toStrictEqual({
          ...sellerApiConfiguration,
          basePath: sellingPartnerBasePath,
        })
      })

      it('should throw error if post fails to resolve', async () => {
        expect.assertions(1)

        jest.spyOn<any, any>(axios, 'post').mockImplementation(() => {
          throw new Error(apiConfigErrorMessage)
        })

        const error = new Error(apiConfigErrorMessage)

        await expect(sp.getClient(OrdersApiClient)).rejects.toStrictEqual(error)
      })
    })

    describe('#getRoleCredentials', () => {
      it('should return role credentials', async () => {
        expect.assertions(2)

        jest.spyOn<any, any>(sp, 'getToken').mockResolvedValue({
          access_token: 'my_token',
          expires_in: 1,
          refresh_token: 'refresh_token_1234',
        })

        const client = await sp.getClient(OrdersApiClient)

        expect(client).toBeInstanceOf(OrdersApiClient)

        expect(sp.configurations.sellingpartnerapi.seller).toStrictEqual({
          ...sellerApiConfiguration,
          basePath: sellingPartnerBasePath,
        })
      })
    })

    describe('#getApiConfiguration', () => {
      it('should properly authorize and return an api configuration', async () => {
        expect.assertions(2)

        jest.spyOn<any, any>(sp, 'getToken').mockResolvedValue({
          access_token: 'my_token',
          expires_in: 1,
          refresh_token: 'refresh_token_1234',
        })

        jest.spyOn<any, any>(sp, 'getRoleCredentials').mockResolvedValue({
          AccessKeyId: '',
          SecretAccessKey: '',
          SessionToken: '',
          Expiration: new Date('05/24/21'),
        })

        const client = await sp.getClient(OrdersApiClient)

        expect(client).toBeInstanceOf(OrdersApiClient)

        expect(sp.configurations.sellingpartnerapi.seller).toStrictEqual({
          ...sellerApiConfiguration,
          basePath: sellingPartnerBasePath,
        })
      })
    })

    describe('#authorize', () => {
      it('should authorize and return apiConfigurations', async () => {
        expect.assertions(3)

        jest
          .spyOn<any, any>(sp, 'getApiConfiguration')
          .mockResolvedValueOnce(sellerApiConfiguration)
        jest
          .spyOn<any, any>(sp, 'getApiConfiguration')
          .mockResolvedValueOnce(vendorApiConfiguration)

        const client = await sp.getClient(OrdersApiClient)

        expect(client).toBeInstanceOf(OrdersApiClient)

        expect(sp.configurations.sellingpartnerapi.seller).toStrictEqual(sellerApiConfiguration)
        expect(sp.configurations.sellingpartnerapi.vendor).toStrictEqual(vendorApiConfiguration)
      })

      it('should not authorize vendor if vendor credentials do not exist', async () => {
        expect.assertions(3)

        const sellingPartner = new SellingPartner({ seller: sellerCredentials }, marketplaceId)

        jest
          .spyOn<any, any>(sellingPartner, 'getApiConfiguration')
          .mockResolvedValueOnce(sellerApiConfiguration)

        const client = await sellingPartner.getClient(OrdersApiClient)

        expect(client).toBeInstanceOf(OrdersApiClient)

        expect(sellingPartner.configurations.sellingpartnerapi.seller).toStrictEqual(
          sellerApiConfiguration,
        )
        expect(sellingPartner.configurations.sellingpartnerapi.vendor).toBeUndefined()
      })

      it('should not authorize seller if seller credentials do not exist', async () => {
        expect.assertions(3)

        const sellingPartner = new SellingPartner({ vendor: vendorCredentials }, marketplaceId)

        jest
          .spyOn<any, any>(sellingPartner, 'getApiConfiguration')
          .mockResolvedValueOnce(vendorApiConfiguration)

        const client = await sellingPartner.getClient(VendorDirectFulfillmentInventoryApiClient)

        expect(client).toBeInstanceOf(VendorDirectFulfillmentInventoryApiClient)

        expect(sellingPartner.configurations.sellingpartnerapi.vendor).toStrictEqual(
          vendorApiConfiguration,
        )
        expect(sellingPartner.configurations.sellingpartnerapi.seller).toBeUndefined()
      })

      it('should authorize vendor if vendorAccessToken has expired', async () => {
        expect.assertions(7)

        const sellingPartner = new SellingPartner({ vendor: vendorCredentials }, marketplaceId)

        const getApiConfigSpy = jest
          .spyOn<any, any>(sellingPartner, 'getApiConfiguration')
          .mockResolvedValue(vendorApiConfiguration)

        // Authorize for a first time
        let client = await sellingPartner.getClient(VendorDirectFulfillmentInventoryApiClient)

        // make sure all assertions are as expected
        expect(client).toBeInstanceOf(VendorDirectFulfillmentInventoryApiClient)
        expect(sellingPartner.configurations.sellingpartnerapi.vendor).toStrictEqual(
          vendorApiConfiguration,
        )
        expect(
          sellingPartner.accessTokenExpirationCache.sellingpartnerapi.vendor,
        ).not.toBeUndefined()
        expect(getApiConfigSpy).toHaveBeenCalledTimes(1)

        // manually change expiration and authorize for a second time
        sellingPartner.accessTokenExpirationCache.sellingpartnerapi.vendor = new Date(
          Date.now() - 5000,
        )
        client = await sellingPartner.getClient(VendorDirectFulfillmentInventoryApiClient)

        // run assertions to make sure we actually re-authorized.
        expect(client).toBeInstanceOf(VendorDirectFulfillmentInventoryApiClient)
        expect(sellingPartner.configurations.sellingpartnerapi.vendor).toStrictEqual(
          vendorApiConfiguration,
        )
        expect(getApiConfigSpy).toHaveBeenCalledTimes(2)
      })

      it('should authorize seller if sellerAccessToken has expired', async () => {
        expect.assertions(7)

        const sellingPartner = new SellingPartner({ seller: sellerCredentials }, marketplaceId)

        const getApiConfigSpy = jest
          .spyOn<any, any>(sellingPartner, 'getApiConfiguration')
          .mockResolvedValue(sellerApiConfiguration)

        // Authorize for a first time
        let client = await sellingPartner.getClient(OrdersApiClient)

        // make sure all assertions are as expected
        expect(client).toBeInstanceOf(OrdersApiClient)
        expect(sellingPartner.configurations.sellingpartnerapi.seller).toStrictEqual(
          sellerApiConfiguration,
        )
        expect(
          sellingPartner.accessTokenExpirationCache.sellingpartnerapi.seller,
        ).not.toBeUndefined()
        expect(getApiConfigSpy).toHaveBeenCalledTimes(1)

        // manually change expiration and authorize for a second time
        sellingPartner.accessTokenExpirationCache.sellingpartnerapi.seller = new Date(
          Date.now() - 5000,
        )
        client = await sellingPartner.getClient(OrdersApiClient)

        // run assertions to make sure we actually re-authorized.
        expect(client).toBeInstanceOf(OrdersApiClient)
        expect(sellingPartner.configurations.sellingpartnerapi.seller).toStrictEqual(
          sellerApiConfiguration,
        )
        expect(getApiConfigSpy).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('public', () => {
    beforeEach(() => {
      jest.spyOn<any, any>(sp, 'getToken').mockResolvedValue({
        access_token: '',
        expires_in: 1,
        refresh_token: 'refresh_token_1234',
      })

      jest.spyOn<any, any>(sp, 'getRoleCredentials').mockResolvedValue({
        AccessKeyId: '',
        SecretAccessKey: '',
        SessionToken: '',
        Expiration: new Date('05/24/21'),
      })
    })

    describe('getAuthClient', () => {
      it('should return a properly instantiated AuthorizationApiClient for seller app', async () => {
        expect.assertions(2)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(sellerApiConfiguration)

        const authClient = await sp.getAuthClient('seller')

        expect(authClient).toBeInstanceOf(AuthorizationApiClient)
        expect(sp.configurations['sellingpartnerapi::migration'].seller).toStrictEqual(
          sellerApiConfiguration,
        )
      })

      it('should return a properly instantiated AuthorizationApiClient for vendor app', async () => {
        expect.assertions(2)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(vendorApiConfiguration)

        const authClient = await sp.getAuthClient('vendor')

        expect(authClient).toBeInstanceOf(AuthorizationApiClient)
        expect(sp.configurations['sellingpartnerapi::migration'].vendor).toStrictEqual(
          vendorApiConfiguration,
        )
      })

      it('should throw error if getToken fails to resolve', async () => {
        expect.assertions(1)

        const error = new Error(apiConfigErrorMessage)

        jest.spyOn<any, any>(sp, 'getToken').mockImplementation(() => Promise.reject(error))

        await expect(sp.getAuthClient('vendor')).rejects.toStrictEqual(error)
      })

      it('should throw error if getRoleCredentials fails to resolve', async () => {
        expect.assertions(1)

        const error = new Error(apiConfigErrorMessage)

        jest
          .spyOn<any, any>(sp, 'getRoleCredentials')
          .mockImplementation(() => Promise.reject(error))

        await expect(sp.getAuthClient('vendor')).rejects.toStrictEqual(error)
      })

      it('should throw error if getApiConfiguration fails to resolve', async () => {
        expect.assertions(1)

        const error = new Error(apiConfigErrorMessage)

        jest
          .spyOn<any, any>(sp, 'getApiConfiguration')
          .mockImplementation(() => Promise.reject(error))

        await expect(sp.getAuthClient('vendor')).rejects.toStrictEqual(error)
      })
    })

    describe('#getClient', () => {
      it('should return instantiated vendor ClientApi', async () => {
        expect.assertions(1)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(vendorApiConfiguration)

        const client = await sp.getClient(VendorDirectFulfillmentInventoryApiClient)

        expect(client).toBeInstanceOf(VendorDirectFulfillmentInventoryApiClient)
      })

      it('should return instantiated seller ClientApi', async () => {
        expect.assertions(1)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(sellerApiConfiguration)

        const client = await sp.getClient(OrdersApiClient)

        expect(client).toBeInstanceOf(OrdersApiClient)
      })

      it('should instantiate ClientApi with vendor config', async () => {
        expect.assertions(1)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(vendorApiConfiguration)

        const client = await sp.getClient(VendorDirectFulfillmentInventoryApiClient)

        // eslint-disable-next-line dot-notation
        expect(client['configuration']?.basePath).toStrictEqual(config.vendor.basePath)
      })

      it('should instantiate ClientApi with seller config', async () => {
        expect.assertions(1)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(sellerApiConfiguration)

        const client = await sp.getClient(OrdersApiClient)

        // eslint-disable-next-line dot-notation
        expect(client['configuration']?.basePath).toStrictEqual(config.seller.basePath)
      })

      it('should throw error if getToken fails to resolve', async () => {
        expect.assertions(1)

        const error = new Error(apiConfigErrorMessage)

        jest.spyOn<any, any>(sp, 'getToken').mockImplementation(() => Promise.reject(error))

        await expect(sp.getClient(VendorDirectFulfillmentInventoryApiClient)).rejects.toStrictEqual(
          error,
        )
      })

      it('should throw error if getRoleCredentials fails to resolve', async () => {
        expect.assertions(1)

        const error = new Error(apiConfigErrorMessage)

        jest
          .spyOn<any, any>(sp, 'getRoleCredentials')
          .mockImplementation(() => Promise.reject(error))

        await expect(sp.getClient(VendorDirectFulfillmentInventoryApiClient)).rejects.toStrictEqual(
          error,
        )
      })

      it('should throw error if getApiConfiguration fails to resolve', async () => {
        expect.assertions(1)

        const error = new Error(apiConfigErrorMessage)

        jest
          .spyOn<any, any>(sp, 'getApiConfiguration')
          .mockImplementation(() => Promise.reject(error))

        await expect(sp.getClient(VendorDirectFulfillmentInventoryApiClient)).rejects.toStrictEqual(
          error,
        )
      })

      it('should NOT throw an error if VendorDirectFulfillmentOrdersApiClient was requested', async () => {
        expect.assertions(1)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(vendorApiConfiguration)

        const client = await sp.getClient(VendorDirectFulfillmentOrdersApiClient)

        expect(client).toBeInstanceOf(VendorDirectFulfillmentOrdersApiClient)
      })

      it('should return instantiated VendorDirectFulfillmentShippingCustomerInvoicesApiClient', async () => {
        expect.assertions(1)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(vendorApiConfiguration)

        const client = await sp.getClient(VendorDirectFulfillmentShippingCustomerInvoicesApiClient)

        expect(client).toBeInstanceOf(VendorDirectFulfillmentShippingCustomerInvoicesApiClient)
      })

      it('should return instantiated VendorDirectFulfillmentShippingVendorShippingApiClient', async () => {
        expect.assertions(1)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(vendorApiConfiguration)

        const client = await sp.getClient(VendorDirectFulfillmentShippingVendorShippingApiClient)

        expect(client).toBeInstanceOf(VendorDirectFulfillmentShippingVendorShippingApiClient)
      })

      it('should return instantiated VendorDirectFulfillmentShippingVendorShippingLabelsApiClient', async () => {
        expect.assertions(1)

        jest.spyOn<any, any>(sp, 'getApiConfiguration').mockResolvedValue(vendorApiConfiguration)

        const client = await sp.getClient(
          VendorDirectFulfillmentShippingVendorShippingLabelsApiClient,
        )

        expect(client).toBeInstanceOf(VendorDirectFulfillmentShippingVendorShippingLabelsApiClient)
      })
    })
  })
})
