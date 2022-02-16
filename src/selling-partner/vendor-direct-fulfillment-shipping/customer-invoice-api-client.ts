import {
  Configuration,
  CustomerInvoicesApi,
} from '../../api-models/vendor-direct-fulfillment-shipping-api-model'
import { ApiClientHelpers } from '../../helpers'
import { DEFAULT_API_BASE_PATH } from '../../types'
import { APIConfigurationParameters } from '../../types/api-clients/api-configuration-parameters'

/**
 * This class is a work around until @scaleleap fixes their generator to account for a many to many model to client generation.
 * See https://github.com/ScaleLeap/selling-partner-api-sdk/issues/200
 */
export class VendorDirectFulfillmentShippingCustomerInvoicesApiClient extends CustomerInvoicesApi {
  constructor(parameters: APIConfigurationParameters) {
    const axios = ApiClientHelpers.getAxiosInstance(parameters)

    const configuration = new Configuration(parameters)

    super(configuration, DEFAULT_API_BASE_PATH, axios)
  }
}
