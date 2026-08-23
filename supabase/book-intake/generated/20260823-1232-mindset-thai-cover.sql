begin;

update public.books
set cover_image_url = 'https://static.wixstatic.com/media/936e61_b3fa34dfc66744e9b8a569149504c0ba~mv2.jpg/v1/fill/w_1000,h_1482,al_c,q_85,enc_avif,quality_auto/936e61_b3fa34dfc66744e9b8a569149504c0ba~mv2.jpg'
where isbn = '9786162872655';

select id, isbn, cover_image_url, is_active
from public.books
where isbn = '9786162872655';

commit;
