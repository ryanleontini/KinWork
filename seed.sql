-- KinOS — Demo seed data
-- Run AFTER schema.sql, in the Supabase SQL editor.
--
-- Creates three demo accounts you can log in with immediately:
--   grandma@miller.family / password123   (kinkeeper)
--   mike@miller.family    / password123
--   jenny@miller.family   / password123
--
-- Safe to run once. Re-running is a no-op (guarded on the demo family id).

do $$
declare
  demo_family uuid := 'f0000000-0000-0000-0000-000000000001';
  grandma uuid := '11111111-1111-1111-1111-111111111111';
  mike    uuid := '22222222-2222-2222-2222-222222222222';
  jenny   uuid := '33333333-3333-3333-3333-333333333333';
  p_welcome uuid := 'a0000000-0000-0000-0000-000000000001';
  p_lake    uuid := 'a0000000-0000-0000-0000-000000000002';
  p_recipe  uuid := 'a0000000-0000-0000-0000-000000000003';
  p_garden  uuid := 'a0000000-0000-0000-0000-000000000004';
  p_story   uuid := 'a0000000-0000-0000-0000-000000000005';
  p_grads   uuid := 'a0000000-0000-0000-0000-000000000006';
  p_sunday  uuid := 'a0000000-0000-0000-0000-000000000007';
begin
  if exists (select 1 from public.families where id = demo_family) then
    raise notice 'Demo family already seeded — skipping.';
    return;
  end if;

  ---------------------------------------------------------------------------
  -- Auth users
  ---------------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values
    ('00000000-0000-0000-0000-000000000000', grandma, 'authenticated', 'authenticated',
     'grandma@miller.family', extensions.crypt('password123', extensions.gen_salt('bf')),
     now(), now() - interval '40 days', now(),
     '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', mike, 'authenticated', 'authenticated',
     'mike@miller.family', extensions.crypt('password123', extensions.gen_salt('bf')),
     now(), now() - interval '38 days', now(),
     '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', jenny, 'authenticated', 'authenticated',
     'jenny@miller.family', extensions.crypt('password123', extensions.gen_salt('bf')),
     now(), now() - interval '36 days', now(),
     '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  values
    (grandma::text, grandma,
     format('{"sub":"%s","email":"%s"}', grandma, 'grandma@miller.family')::jsonb,
     'email', now(), now(), now()),
    (mike::text, mike,
     format('{"sub":"%s","email":"%s"}', mike, 'mike@miller.family')::jsonb,
     'email', now(), now(), now()),
    (jenny::text, jenny,
     format('{"sub":"%s","email":"%s"}', jenny, 'jenny@miller.family')::jsonb,
     'email', now(), now(), now())
  on conflict (provider, provider_id) do nothing;

  ---------------------------------------------------------------------------
  -- Family + members
  ---------------------------------------------------------------------------
  insert into public.families (id, name, tagline, photo_url, created_by, created_at)
  values (
    demo_family, 'The Miller Family',
    'Here''s what''s been happening lately.',
    'https://picsum.photos/seed/millerfam/400/400',
    grandma, now() - interval '40 days'
  );

  insert into public.family_members (family_id, user_id, role, display_name, avatar_url, joined_at)
  values
    (demo_family, grandma, 'kinkeeper', 'Grandma Sarah',
     'https://picsum.photos/seed/sarah/200/200', now() - interval '40 days'),
    (demo_family, mike, 'member', 'Mike Miller',
     'https://picsum.photos/seed/mike/200/200', now() - interval '38 days'),
    (demo_family, jenny, 'member', 'Jenny Miller',
     'https://picsum.photos/seed/jenny/200/200', now() - interval '36 days');

  ---------------------------------------------------------------------------
  -- Posts
  ---------------------------------------------------------------------------
  insert into public.posts (id, family_id, author_id, content, type, status, created_at)
  values
    (p_welcome, demo_family, grandma,
     'Welcome to our family garden, everyone! I made this little space so we can keep our photos and stories all in one cozy place. So glad you''re all here. ❤️',
     'post', 'published', now() - interval '12 days'),
    (p_lake, demo_family, mike,
     'Found these gems from the lake house. Can''t believe how little the kids were!',
     'photo', 'published', now() - interval '9 days'),
    (p_recipe, demo_family, grandma,
     E'Grandma''s Apple Pie\n\nIngredients:\n- 6 apples, peeled and sliced\n- 1 cup sugar\n- 2 tsp cinnamon\n- 2 pie crusts\n- 2 tbsp butter\n\nInstructions:\nToss the apples with sugar and cinnamon. Fill the crust, dot with butter, and cover. Bake at 425°F for 15 minutes, then 350°F for another 45. Let it cool before everyone descends on it!',
     'recipe', 'published', now() - interval '7 days'),
    (p_garden, demo_family, jenny,
     'The tomatoes are finally coming in! Grandma''s green thumb skipped a generation but maybe it''s back. 🍅',
     'photo', 'published', now() - interval '5 days'),
    (p_story, demo_family, grandma,
     E'How Grandpa and I Met\n\nIt was the summer of 1961 at the county fair. He was running the ring-toss booth and I lost three weeks'' allowance trying to win a teddy bear. He finally just handed me one and asked for my name. We were married the next spring. Sixty-one years and four children later, I''d lose that allowance all over again.',
     'story', 'published', now() - interval '3 days'),
    (p_grads, demo_family, mike,
     'Jenny graduated!! We are SO proud of you. 🎓',
     'photo', 'published', now() - interval '2 days'),
    (p_sunday, demo_family, jenny,
     'Sunday dinner at Grandma''s was perfect as always. Same table, same stories, same too-much-food. Wouldn''t trade it.',
     'post', 'published', now() - interval '20 hours');

  ---------------------------------------------------------------------------
  -- Post media
  ---------------------------------------------------------------------------
  insert into public.post_media (post_id, media_url, media_type, caption)
  values
    (p_lake, 'https://picsum.photos/seed/lake1/800/600', 'image', 'Dock days'),
    (p_lake, 'https://picsum.photos/seed/lake2/800/600', 'image', 'The old canoe'),
    (p_garden, 'https://picsum.photos/seed/tomatoes/800/600', 'image', null),
    (p_grads, 'https://picsum.photos/seed/grad/800/600', 'image', 'Cap and gown'),
    (p_recipe, 'https://picsum.photos/seed/applepie/800/600', 'image', 'The famous pie');

  ---------------------------------------------------------------------------
  -- Reactions (hearts) — UNIQUE(post_id, user_id)
  ---------------------------------------------------------------------------
  insert into public.reactions (post_id, user_id, emoji, created_at)
  values
    (p_welcome, mike, '❤️', now() - interval '11 days'),
    (p_welcome, jenny, '❤️', now() - interval '11 days'),
    (p_lake, grandma, '❤️', now() - interval '9 days'),
    (p_lake, jenny, '❤️', now() - interval '8 days'),
    (p_recipe, mike, '❤️', now() - interval '6 days'),
    (p_recipe, jenny, '❤️', now() - interval '6 days'),
    (p_story, mike, '❤️', now() - interval '3 days'),
    (p_story, jenny, '❤️', now() - interval '2 days'),
    (p_grads, grandma, '❤️', now() - interval '1 day'),
    (p_grads, jenny, '❤️', now() - interval '1 day'),
    (p_sunday, grandma, '❤️', now() - interval '18 hours')
  on conflict (post_id, user_id) do nothing;

  ---------------------------------------------------------------------------
  -- Comments
  ---------------------------------------------------------------------------
  insert into public.comments (post_id, author_id, content, created_at)
  values
    (p_welcome, mike, 'This is wonderful, Mom. Thank you!', now() - interval '11 days'),
    (p_lake, jenny, 'Look at Dad''s hair!! 😂', now() - interval '8 days'),
    (p_lake, grandma, 'Best summers of our lives.', now() - interval '8 days'),
    (p_recipe, jenny, 'Making this for Thanksgiving. Non-negotiable.', now() - interval '6 days'),
    (p_story, jenny, 'I''ve never heard this story! Love it.', now() - interval '2 days'),
    (p_grads, grandma, 'My heart is so full. Congratulations sweetheart!', now() - interval '1 day');

  ---------------------------------------------------------------------------
  -- Garden items (across 3 folders)
  ---------------------------------------------------------------------------
  insert into public.garden_items (family_id, uploaded_by, title, description, media_url, media_type, folder, created_at)
  values
    (demo_family, mike, 'Sunset over the dock', 'Last evening at the lake, 1998.', 'https://picsum.photos/seed/lh1/800/600', 'image', 'Lake House Trip ''98', now() - interval '30 days'),
    (demo_family, mike, 'The whole gang', null, 'https://picsum.photos/seed/lh2/800/600', 'image', 'Lake House Trip ''98', now() - interval '30 days'),
    (demo_family, grandma, 'Morning swim', 'The kids never wanted to come in.', 'https://picsum.photos/seed/lh3/800/600', 'image', 'Lake House Trip ''98', now() - interval '30 days'),
    (demo_family, jenny, 'Campfire night', null, 'https://picsum.photos/seed/lh4/800/600', 'image', 'Lake House Trip ''98', now() - interval '29 days'),
    (demo_family, grandma, 'Apple pie', 'The original recipe card.', 'https://picsum.photos/seed/r1/800/600', 'image', 'Family Recipes', now() - interval '25 days'),
    (demo_family, grandma, 'Sunday pot roast', null, 'https://picsum.photos/seed/r2/800/600', 'image', 'Family Recipes', now() - interval '25 days'),
    (demo_family, jenny, 'Holiday cookies', 'Great-grandma''s gingerbread.', 'https://picsum.photos/seed/r3/800/600', 'image', 'Family Recipes', now() - interval '24 days'),
    (demo_family, mike, 'Christmas 2023', 'Everyone made it home.', 'https://picsum.photos/seed/h1/800/600', 'image', 'Holidays', now() - interval '20 days'),
    (demo_family, jenny, 'Decorating the tree', null, 'https://picsum.photos/seed/h2/800/600', 'image', 'Holidays', now() - interval '20 days'),
    (demo_family, grandma, 'Thanksgiving table', 'No room left for elbows.', 'https://picsum.photos/seed/h3/800/600', 'image', 'Holidays', now() - interval '19 days'),
    (demo_family, mike, 'New Year fireworks', null, 'https://picsum.photos/seed/h4/800/600', 'image', 'Holidays', now() - interval '18 days'),
    (demo_family, jenny, 'Grandma''s garden', 'Where it all grows.', 'https://picsum.photos/seed/g1/800/600', 'image', null, now() - interval '10 days');

  ---------------------------------------------------------------------------
  -- Chat messages
  ---------------------------------------------------------------------------
  insert into public.messages (family_id, sender_id, content, media_url, created_at)
  values
    (demo_family, grandma, 'Good morning my loves! ☀️', null, now() - interval '6 hours'),
    (demo_family, mike, 'Morning Mom! Still on for Sunday?', null, now() - interval '5 hours 50 minutes'),
    (demo_family, grandma, 'Of course. 5pm sharp. Jenny, bring that boy if you''d like!', null, now() - interval '5 hours 40 minutes'),
    (demo_family, jenny, 'Mom! 🙈 ...maybe. I''ll ask.', null, now() - interval '5 hours 30 minutes'),
    (demo_family, mike, 'I''ll bring the wine 🍷', null, now() - interval '5 hours'),
    (demo_family, grandma, 'Perfect. Can''t wait to see you all.', null, now() - interval '4 hours 50 minutes');
end $$;
