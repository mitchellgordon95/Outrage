declare namespace google {
  namespace maps {
    namespace places {
      class Autocomplete {
        constructor(
          inputField: HTMLInputElement,
          options?: AutocompleteOptions
        );
        addListener(
          eventName: string,
          handler: () => void
        ): void;
        getPlace(): {
          address_components?: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
          formatted_address?: string;
          geometry?: {
            location: {
              lat(): number;
              lng(): number;
            };
          };
        };
      }

      interface AutocompleteOptions {
        bounds?: object;
        componentRestrictions?: {
          country: string | string[];
        };
        fields?: string[];
        types?: string[];
      }
    }
  }
}

declare namespace chrome {
  namespace runtime {
    function sendMessage(
      extensionId: string,
      message: any,
      responseCallback?: (response: any) => void
    ): void;
    
    const lastError: {
      message?: string;
    } | undefined;
  }
}