#!/usr/bin/bash

cp test/schemas/marc21-bibliographic.json docs
#cp test/schemas/k10plus-zentral-marc.json docs
#curl -s 'https://format.k10plus.de/avram.pl?profile=k10plus' > docs/k10plus-pica.json

for schema in docs/*.json; do
  echo $schema
  ./bin/avram.js -d html $schema > "${schema%.json}.html"
done
