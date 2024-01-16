#!/usr/bin/bash

cp test/schemas/marc21-bibliographic.json pages
#cp test/schemas/k10plus-zentral-marc.json pages
#curl -s 'https://format.k10plus.de/avram.pl?profile=k10plus' > pages/k10plus-pica.json

cd pages
for name in k10plus-pica marc21-bibliographic k10plus-zentral-marc unimarc; do
  ../bin/avram.js -n -d $name.json > $name.html
done
cd -
