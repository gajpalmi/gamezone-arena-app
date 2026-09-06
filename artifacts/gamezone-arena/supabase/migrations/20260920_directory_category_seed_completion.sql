-- Add the remaining requested category labels without deleting or renumbering existing rows.
insert into public.business_categories(slug,name,description,sort_order) values
('supermarket','Supermarket','Supermarkets and larger grocery stores',500),
('shoes','Shoes','Footwear businesses',510),('cafe','Cafe','Cafes and beverages',520),
('gym-fitness','Gym / Fitness','Gyms and fitness services',530),('painter','Painter','Painting professionals',540),
('event-services','Event Services','Events and celebrations',550),('travel','Travel','Travel services',560),
('transport','Transport','Transport services',570),('repair-services','Repair Services','General repair services',580)
on conflict(slug) do update set name=excluded.name,description=excluded.description;

insert into public.offering_categories(kind,slug,name,sort_order) values
('product','fruits-vegetables','Fruits & Vegetables',260),('product','laptop','Laptop',270),
('product','beauty-personal-care','Beauty & Personal Care',280),('product','stationery','Stationery',290),
('service','home-cleaning','Home Cleaning',280),('service','refrigerator-repair','Refrigerator Repair',290),
('service','washing-machine-repair','Washing Machine Repair',300)
on conflict(kind,slug) do update set name=excluded.name,sort_order=excluded.sort_order,is_active=true;

insert into public.job_categories(slug,name,sort_order) values
('office-administration','Office / Administration',320),('finance-accounting','Finance / Accounting',330),
('design','Design',340),('data-entry','Data Entry',350)
on conflict(slug) do update set name=excluded.name,sort_order=excluded.sort_order,is_active=true;