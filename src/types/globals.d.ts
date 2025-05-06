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