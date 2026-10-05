alter table public.email_templates drop constraint if exists email_templates_kind;
alter table public.email_templates
  add constraint email_templates_kind check (
    kind in (
      'signup',
      'password_reset',
      'invite',
      'guest',
      'event',
      'delete_confirm',
      'delete_started',
      'delete_done'
    )
  );

insert into public.email_templates (kind, language_code, subject, body, button_label)
values
  (
    'guest',
    'lv',
    'Uzaicinājums uz treniņu - {team}',
    E'Sveiki, {name}!\n\n{inviter} uzaicina tevi uz treniņu komandā {team} sistēmā {system}.\n\n{date} {time}, {venue}.\n\nNospied pogu, lai atvērtu treniņu. Ja konta vēl nav, vispirms reģistrējies ar Google vai ar e-pastu.',
    'Atvērt treniņu'
  ),
  (
    'guest',
    'en',
    'Training invite - {team}',
    E'Hello, {name}!\n\n{inviter} invited you to a training with {team} in {system}.\n\n{date} {time}, {venue}.\n\nPress the button to open the training. If you do not have an account yet, sign up with Google or with email first.',
    'Open the training'
  ),
  (
    'guest',
    'ru',
    'Приглашение на тренировку - {team}',
    E'Здравствуйте, {name}!\n\n{inviter} приглашает тебя на тренировку команды {team} в системе {system}.\n\n{date} {time}, {venue}.\n\nНажми кнопку, чтобы открыть тренировку. Если аккаунта ещё нет, сначала зарегистрируйся через Google или по e-mail.',
    'Открыть тренировку'
  )
on conflict (kind, language_code) do nothing;
