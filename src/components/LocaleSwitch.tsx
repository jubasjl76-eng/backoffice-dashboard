import { useT } from '../i18n';
import { Btn } from './ui';

export function LocaleSwitch({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useT();
  return (
    <div className={`flex gap-1 ${className}`} role="group" aria-label={t('lang.switch')}>
      <Btn size="sm" variant={locale === 'pt' ? 'primary' : 'ghost'} onClick={() => setLocale('pt')}>
        PT
      </Btn>
      <Btn size="sm" variant={locale === 'en' ? 'primary' : 'ghost'} onClick={() => setLocale('en')}>
        EN
      </Btn>
    </div>
  );
}
