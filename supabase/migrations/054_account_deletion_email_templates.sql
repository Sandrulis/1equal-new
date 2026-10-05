alter table public.email_templates drop constraint if exists email_templates_kind;
alter table public.email_templates
  add constraint email_templates_kind check (
    kind in (
      'signup',
      'password_reset',
      'invite',
      'event',
      'delete_confirm',
      'delete_started',
      'delete_done'
    )
  );

insert into public.email_templates (kind, language_code, subject, body, button_label)
values
  (
    'delete_confirm',
    'lv',
    'Apstiprini konta dzēšanu - {system}',
    E'Sveiki, {name}!\n\nSaņēmām pieprasījumu dzēst tavu kontu sistēmā {system}.\n\nNospied pogu, lai deaktivizētu kontu. Tas tiks dzēsts pēc 30 dienām. Ja ielogosies pa šo laiku, dzēšana tiks atcelta.',
    'Apstiprināt dzēšanu'
  ),
  (
    'delete_confirm',
    'en',
    'Confirm account deletion - {system}',
    E'Hello, {name}!\n\nWe received a request to delete your account in {system}.\n\nPress the button to deactivate the account. It will be deleted after 30 days. If you log in during that time, deletion is cancelled.',
    'Confirm deletion'
  ),
  (
    'delete_confirm',
    'ru',
    'Подтверди удаление аккаунта - {system}',
    E'Здравствуйте, {name}!\n\nМы получили запрос удалить твой аккаунт в {system}.\n\nНажми кнопку, чтобы деактивировать аккаунт. Он будет удалён через 30 дней. Если войдёшь за это время, удаление отменится.',
    'Подтвердить удаление'
  ),
  (
    'delete_started',
    'lv',
    'Konts ir deaktivizēts - {system}',
    E'Sveiki, {name}!\n\nTavs konts ir deaktivizēts un tiks dzēsts {date}.\n\nJa ielogosies pirms šī datuma, profils tiks atjaunots un dzēšana atcelta.',
    'Ienākt un atcelt dzēšanu'
  ),
  (
    'delete_started',
    'en',
    'Account deactivated - {system}',
    E'Hello, {name}!\n\nYour account is deactivated and will be deleted on {date}.\n\nIf you log in before that date, your profile is restored and deletion is cancelled.',
    'Log in and cancel deletion'
  ),
  (
    'delete_started',
    'ru',
    'Аккаунт деактивирован - {system}',
    E'Здравствуйте, {name}!\n\nТвой аккаунт деактивирован и будет удалён {date}.\n\nЕсли войдёшь до этой даты, профиль восстановится и удаление отменится.',
    'Войти и отменить удаление'
  ),
  (
    'delete_done',
    'lv',
    'Konts ir dzēsts - {system}',
    E'Sveiki, {name}!\n\n30 dienas ir pagājušas. Tavs konts sistēmā {system} ir dzēsts.',
    ''
  ),
  (
    'delete_done',
    'en',
    'Account deleted - {system}',
    E'Hello, {name}!\n\nThe 30 days have passed. Your account in {system} has been deleted.',
    ''
  ),
  (
    'delete_done',
    'ru',
    'Аккаунт удалён - {system}',
    E'Здравствуйте, {name}!\n\n30 дней прошли. Твой аккаунт в {system} удалён.',
    ''
  )
on conflict (kind, language_code) do nothing;

notify pgrst, 'reload schema';
