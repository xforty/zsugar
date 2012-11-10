
#!/bin/bash

sed -i "s/$1/$2/g" com_xforty_zsugar.xml

sed -i "s/$1/$2/g" com_xforty_zsugar.properties
sed -i "s/$1/$2/g" com_xforty_zsugar_eu.properties
sed -i "s/$1/$2/g" com_xforty_zsugar_es.properties

sed -i "s/$1/$2/g" doc/README
sed -i "s/$1/$2/g" doc/INSTALL
sed -i "s/$1/$2/g" doc/LICENSE

