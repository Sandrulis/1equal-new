insert into public.site_languages (code, name, is_active, is_default, sort_order)
values ('ru', 'Русский', true, false, 2)
on conflict (code) do update
set name = excluded.name,
    is_active = true;

insert into public.email_templates (kind, language_code, subject, body, button_label)
values
  (
    'signup',
    'ru',
    'Подтвердите почту - {system}',
    E'Здравствуйте, {name}!\n\nСпасибо за регистрацию в {system}.\n\nНажмите кнопку ниже, чтобы подтвердить почту.',
    'Подтвердить почту'
  ),
  (
    'password_reset',
    'ru',
    'Восстановление пароля - {system}',
    E'Здравствуйте, {name}!\n\nМы получили запрос на смену пароля в {system}.\n\nНажмите кнопку ниже, чтобы задать новый пароль.',
    'Сменить пароль'
  ),
  (
    'invite',
    'ru',
    'Приглашение в команду {team}',
    E'Здравствуйте, {name}!\n\n{inviter} приглашает вас в команду {team} в системе {system}.\n\nНажмите кнопку ниже, чтобы присоединиться.',
    'Вступить в команду'
  ),
  (
    'event',
    'ru',
    'Новое событие: {team}',
    E'Здравствуйте, {name}!\n\nУ команды {team} новое событие.\n\n{type}\n{date} {time}\n{venue}\nЦена: {price}\n\nМожно проголосовать в системе или сразу в конце этого письма.',
    'Проголосовать в системе'
  )
on conflict (kind, language_code) do nothing;

notify pgrst, 'reload schema';
