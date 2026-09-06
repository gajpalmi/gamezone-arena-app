-- Complete additive directory taxonomy. Existing IDs and relationships remain intact.
insert into public.business_categories(slug,name,description,sort_order) values
('grocery-general-store','Grocery / General Store','Groceries and daily essentials',200),
('mobile-accessories','Mobile & Accessories','Mobile devices and accessories',210),
('clothing-fashion','Clothing & Fashion','Clothing and fashion',220),
('food-restaurant','Food & Restaurant','Food and restaurants',230),('bakery','Bakery','Bakery and desserts',240),
('pharmacy-medical','Pharmacy / Medical','Pharmacy and medical',250),('education','Education','Education services',260),
('tuition-coaching','Tuition / Coaching','Tuition and coaching',270),('beauty-salon','Beauty & Salon','Beauty and salon',280),
('health-wellness','Health & Wellness','Health and wellness',290),('automotive','Automotive','Automotive businesses',300),
('bike-repair','Bike Repair','Bike repair',310),('car-repair','Car Repair','Car repair',320),
('electrician','Electrician','Electrical services',330),('plumber','Plumber','Plumbing services',340),
('carpenter','Carpenter','Carpentry services',350),('painting','Painting','Painting services',360),
('cleaning','Cleaning','Cleaning services',370),('home-services','Home Services','Home services',380),
('computer-it','Computer & IT','Computer and IT',390),('photography','Photography','Photography services',400),
('travel-transport','Travel & Transport','Travel and transport',410),('delivery','Delivery','Delivery services',420),
('agriculture','Agriculture','Agriculture businesses',430),('real-estate','Real Estate','Real estate',440),
('professional-services','Professional Services','Professional services',450)
on conflict(slug) do update set name=excluded.name,description=excluded.description;

insert into public.offering_categories(kind,slug,name,sort_order) values
('product','food','Food',110),('product','mobile-accessories','Mobile Accessories',120),('product','computer','Computer',130),
('product','shoes','Shoes',140),('product','fashion','Fashion',150),('product','appliances','Appliances',160),
('product','beauty','Beauty',170),('product','personal-care','Personal Care',180),('product','bike-parts','Bike Parts',190),
('product','car-parts','Car Parts',200),('product','hardware','Hardware',210),('product','agriculture','Agriculture',220),
('product','books','Books',230),('product','toys','Toys',240),('product','sports','Sports',250),
('service','painter','Painter',110),('service','mason','Mason',120),('service','mobile-repair','Mobile Repair',130),
('service','computer-repair','Computer Repair',140),('service','ac-repair','AC Repair',150),('service','fridge-repair','Fridge Repair',160),
('service','bike-repair','Bike Repair',170),('service','car-repair','Car Repair',180),('service','driver','Driver',190),
('service','coaching','Coaching',200),('service','beauty-salon','Beauty / Salon',210),('service','photography','Photography',220),
('service','event-services','Event Services',230),('service','home-services','Home Services',240),('service','it-services','IT Services',250),
('service','transport','Transport',260),('service','agriculture-services','Agriculture Services',270)
on conflict(kind,slug) do update set name=excluded.name,sort_order=excluded.sort_order,is_active=true;

insert into public.job_categories(slug,name,sort_order) values
('electrical','Electrical',110),('plumbing','Plumbing',120),('construction','Construction',130),('driver','Driver',140),
('delivery','Delivery',150),('security','Security',160),('sales','Sales',170),('marketing','Marketing',180),
('office','Office',190),('computer-it','Computer / IT',200),('teaching','Teaching',210),('restaurant-hotel','Restaurant / Hotel',220),
('retail','Retail',230),('mechanic','Mechanic',240),('technician','Technician',250),('factory-manufacturing','Factory / Manufacturing',260),
('agriculture','Agriculture',270),('healthcare','Healthcare',280),('beauty-salon','Beauty / Salon',290),
('cleaning','Cleaning',300),('customer-service','Customer Service',310),('other','Other',999)
on conflict(slug) do update set name=excluded.name,sort_order=excluded.sort_order,is_active=true;