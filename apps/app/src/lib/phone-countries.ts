export interface PhoneCountry {
  code: string
  name: string
  flag: string
  dial_code: string
}

// Mostrados primero en el selector (mercados principales de la app)
export const PRIORITY_DIAL_CODES = new Set([
  '+56',
  '+52',
  '+57',
  '+54',
  '+51',
  '+591',
  '+58',
  '+593',
  '+598',
  '+595',
  '+55',
  '+1',
  '+34',
])

export const PHONE_COUNTRIES: PhoneCountry[] = [
  // ── Latinoamérica ───────────────────────────────────────────
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dial_code: '+56' },
  { code: 'MX', name: 'México', flag: '🇲🇽', dial_code: '+52' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dial_code: '+57' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial_code: '+54' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', dial_code: '+51' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dial_code: '+591' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dial_code: '+58' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dial_code: '+593' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dial_code: '+598' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dial_code: '+595' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', dial_code: '+55' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dial_code: '+506' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', dial_code: '+507' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dial_code: '+502' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', dial_code: '+504' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', dial_code: '+503' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dial_code: '+505' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', dial_code: '+1809' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', dial_code: '+53' },
  // ── América del Norte ───────────────────────────────────────
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', dial_code: '+1' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', dial_code: '+1' },
  // ── Europa ─────────────────────────────────────────────────
  { code: 'ES', name: 'España', flag: '🇪🇸', dial_code: '+34' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial_code: '+351' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪', dial_code: '+49' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷', dial_code: '+33' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', dial_code: '+44' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', dial_code: '+39' },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱', dial_code: '+31' },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪', dial_code: '+32' },
  { code: 'CH', name: 'Suiza', flag: '🇨🇭', dial_code: '+41' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', dial_code: '+43' },
  { code: 'SE', name: 'Suecia', flag: '🇸🇪', dial_code: '+46' },
  { code: 'NO', name: 'Noruega', flag: '🇳🇴', dial_code: '+47' },
  { code: 'DK', name: 'Dinamarca', flag: '🇩🇰', dial_code: '+45' },
  { code: 'FI', name: 'Finlandia', flag: '🇫🇮', dial_code: '+358' },
  { code: 'PL', name: 'Polonia', flag: '🇵🇱', dial_code: '+48' },
  { code: 'RU', name: 'Rusia', flag: '🇷🇺', dial_code: '+7' },
  { code: 'UA', name: 'Ucrania', flag: '🇺🇦', dial_code: '+380' },
  // ── Asia / Pacífico ─────────────────────────────────────────
  { code: 'CN', name: 'China', flag: '🇨🇳', dial_code: '+86' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵', dial_code: '+81' },
  { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷', dial_code: '+82' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dial_code: '+91' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dial_code: '+61' },
  { code: 'NZ', name: 'Nueva Zelanda', flag: '🇳🇿', dial_code: '+64' },
  // ── Medio Oriente / África ──────────────────────────────────
  { code: 'IL', name: 'Israel', flag: '🇮🇱', dial_code: '+972' },
  { code: 'SA', name: 'Arabia Saudita', flag: '🇸🇦', dial_code: '+966' },
  { code: 'AE', name: 'Emiratos Árabes', flag: '🇦🇪', dial_code: '+971' },
  { code: 'TR', name: 'Turquía', flag: '🇹🇷', dial_code: '+90' },
  { code: 'ZA', name: 'Sudáfrica', flag: '🇿🇦', dial_code: '+27' },
  { code: 'MA', name: 'Marruecos', flag: '🇲🇦', dial_code: '+212' },
]
