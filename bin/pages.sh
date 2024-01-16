#!/usr/bin/bash

cp test/schemas/marc21-bibliographic.json docs
#cp test/schemas/k10plus-zentral-marc.json docs
#curl -s 'https://format.k10plus.de/avram.pl?profile=k10plus' > docs/k10plus-pica.json

cd docs
for name in k10plus-pica marc21-bibliographic k10plus-zentral-marc unimarc; do
  ../bin/avram.js -n -d $name.json > $name.html
done
cd -
