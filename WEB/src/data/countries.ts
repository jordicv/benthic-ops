export interface Country {
  name: string;
  code: string;
  flag: string;
  dialCode: string;
}

export const countries: Country[] = [
  { name: "Chile", code: "CL", flag: "🇨🇱", dialCode: "+56" },
  { name: "Alemania", code: "DE", flag: "🇩🇪", dialCode: "+49" },
  { name: "España", code: "ES", flag: "🇪🇸", dialCode: "+34" },
  { name: "Estados Unidos", code: "US", flag: "🇺🇸", dialCode: "+1" },
  { name: "México", code: "MX", flag: "🇲🇽", dialCode: "+52" },
  { name: "Colombia", code: "CO", flag: "🇨🇴", dialCode: "+57" },
  { name: "Argentina", code: "AR", flag: "🇦🇷", dialCode: "+54" },
  { name: "Perú", code: "PE", flag: "🇵🇪", dialCode: "+51" },
  { name: "Venezuela", code: "VE", flag: "🇻🇪", dialCode: "+58" },
  { name: "Brasil", code: "BR", flag: "🇧🇷", dialCode: "+55" },
  { name: "Ecuador", code: "EC", flag: "🇪🇨", dialCode: "+593" },
  { name: "Bolivia", code: "BO", flag: "🇧🇴", dialCode: "+591" },
  { name: "Uruguay", code: "UY", flag: "🇺🇾", dialCode: "+598" },
  { name: "Paraguay", code: "PY", flag: "🇵🇾", dialCode: "+595" },
  { name: "Costa Rica", code: "CR", flag: "🇨🇷", dialCode: "+506" },
  { name: "Panamá", code: "PA", flag: "🇵🇦", dialCode: "+507" },
  { name: "Guatemala", code: "GT", flag: "🇬🇹", dialCode: "+502" },
  { name: "Honduras", code: "HN", flag: "🇭🇳", dialCode: "+504" },
  { name: "El Salvador", code: "SV", flag: "🇸🇻", dialCode: "+503" },
  { name: "Nicaragua", code: "NI", flag: "🇳🇮", dialCode: "+505" },
  { name: "República Dominicana", code: "DO", flag: "🇩🇴", dialCode: "+1" },
  { name: "Puerto Rico", code: "PR", flag: "🇵🇷", dialCode: "+1" },
  { name: "Cuba", code: "CU", flag: "🇨🇺", dialCode: "+53" },
  { name: "Italia", code: "IT", flag: "🇮🇹", dialCode: "+39" },
  { name: "Francia", code: "FR", flag: "🇫🇷", dialCode: "+33" },
  { name: "Reino Unido", code: "GB", flag: "🇬🇧", dialCode: "+44" },
  { name: "Portugal", code: "PT", flag: "🇵🇹", dialCode: "+351" },
  { name: "Canadá", code: "CA", flag: "🇨🇦", dialCode: "+1" },
  { name: "China", code: "CN", flag: "🇨🇳", dialCode: "+86" },
  { name: "Japón", code: "JP", flag: "🇯🇵", dialCode: "+81" },
  { name: "Australia", code: "AU", flag: "🇦🇺", dialCode: "+61" },
  { name: "Nueva Zelanda", code: "NZ", flag: "🇳🇿", dialCode: "+64" }
];
