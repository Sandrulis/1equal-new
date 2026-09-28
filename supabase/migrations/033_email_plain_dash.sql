update public.email_templates
set subject = replace(replace(subject, '—', '-'), '–', '-'),
    body = replace(replace(body, '—', '-'), '–', '-'),
    button_label = replace(replace(button_label, '—', '-'), '–', '-')
where subject like '%—%'
   or subject like '%–%'
   or body like '%—%'
   or body like '%–%'
   or button_label like '%—%'
   or button_label like '%–%';

notify pgrst, 'reload schema';
