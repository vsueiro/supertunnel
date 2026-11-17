# SuperTunnel
SuperTunnel is an educational tool that simulates a hole through Earth, indicating where in the world you would end up if you were to dig in a certain direction.

Check it live → [supertunnel.app](https://supertunnel.app)

## Country data
Country shapes come from [Natural Earth](https://www.naturalearthdata.com/) 1:50m Admin 0 – Countries (public domain), and are built with [scripts/build-countries.js](scripts/build-countries.js).

Polygons smaller than 250 km² (measured before simplification) are left out, smallest first, as long as each country keeps at least 90% of its area. Every country is still shown, though some of its smaller islands may be missing.

Out of 1,620 polygons in 242 countries, 966 are kept and 654 are left out (from 96 countries). The same polygons are left out of both the desktop (high-resolution) and mobile (low-resolution) versions.

<details>
<summary>Countries with polygons left out</summary>

| Country | Polygons kept | Polygons left out | Area left out (km²) | Share of area left out |
|---|---:|---:|---:|---:|
| Åland | 2 | 1 | 54 | 7.1% |
| Antarctica | 64 | 44 | 6,431 | 0.05% |
| Argentina | 3 | 1 | 158 | 0.01% |
| Armenia | 1 | 1 | 40 | 0.1% |
| Australia | 18 | 24 | 2,867 | 0.04% |
| Australian Indian Ocean Territories | 1 | 2 | 13 | 9.2% |
| Azerbaijan | 2 | 1 | 35 | 0.04% |
| Bangladesh | 3 | 4 | 588 | 0.4% |
| Belize | 1 | 2 | 230 | 1.0% |
| Brazil | 11 | 6 | 1,113 | 0.01% |
| Cambodia | 1 | 2 | 102 | 0.06% |
| Canada | 88 | 53 | 6,471 | 0.07% |
| Cape Verde | 7 | 1 | 180 | 5.0% |
| Chile | 24 | 7 | 858 | 0.1% |
| China | 5 | 8 | 890 | 0.01% |
| Colombia | 1 | 1 | 99 | 0.01% |
| Croatia | 8 | 5 | 410 | 0.8% |
| Cuba | 4 | 3 | 497 | 0.5% |
| Denmark | 6 | 6 | 861 | 2.0% |
| East Timor | 2 | 1 | 112 | 0.7% |
| Ecuador | 7 | 2 | 208 | 0.08% |
| Eritrea | 2 | 1 | 76 | 0.06% |
| Estonia | 3 | 1 | 169 | 0.4% |
| Falkland Islands | 2 | 4 | 492 | 4.3% |
| Faroe Islands | 4 | 1 | 83 | 8.0% |
| Federated States of Micronesia | 3 | 2 | 47 | 9.0% |
| Fiji | 4 | 17 | 945 | 5.1% |
| Finland | 1 | 7 | 840 | 0.3% |
| France | 8 | 2 | 275 | 0.04% |
| French Polynesia | 13 | 8 | 223 | 8.5% |
| French Southern and Antarctic Lands | 2 | 1 | 108 | 1.6% |
| Germany | 3 | 3 | 388 | 0.1% |
| Greece | 18 | 22 | 2,312 | 1.8% |
| Greenland | 14 | 3 | 612 | 0.03% |
| Guinea-Bissau | 1 | 6 | 820 | 2.6% |
| Haiti | 2 | 1 | 207 | 0.8% |
| Honduras | 1 | 2 | 226 | 0.2% |
| Hong Kong | 2 | 1 | 77 | 7.5% |
| India | 4 | 10 | 827 | 0.03% |
| Indonesia | 82 | 51 | 6,516 | 0.3% |
| Ireland | 1 | 1 | 120 | 0.2% |
| Italy | 3 | 5 | 502 | 0.2% |
| Ivory Coast | 1 | 1 | 67 | 0.02% |
| Japan | 14 | 20 | 2,706 | 0.7% |
| Kazakhstan | 1 | 3 | 279 | 0.01% |
| Kenya | 1 | 1 | 133 | 0.02% |
| Kiribati | 11 | 8 | 80 | 8.5% |
| Lithuania | 1 | 1 | 106 | 0.2% |
| Madagascar | 2 | 1 | 187 | 0.03% |
| Malawi | 1 | 2 | 183 | 0.2% |
| Malaysia | 6 | 3 | 331 | 0.1% |
| Marshall Islands | 4 | 1 | 9.4 | 3.9% |
| Mauritania | 1 | 1 | 196 | 0.02% |
| Mexico | 7 | 9 | 1,177 | 0.06% |
| Myanmar | 7 | 12 | 1,528 | 0.2% |
| Netherlands | 2 | 10 | 757 | 2.0% |
| New Caledonia | 3 | 3 | 349 | 1.9% |
| New Zealand | 6 | 7 | 549 | 0.2% |
| Nigeria | 1 | 1 | 178 | 0.02% |
| North Korea | 1 | 1 | 46 | 0.04% |
| Northern Mariana Islands | 5 | 1 | 38 | 9.7% |
| Norway | 15 | 17 | 2,778 | 0.7% |
| Oman | 3 | 1 | 62 | 0.02% |
| Palau | 1 | 1 | 17 | 5.1% |
| Panama | 2 | 3 | 327 | 0.4% |
| Papua New Guinea | 17 | 9 | 1,267 | 0.3% |
| Philippines | 30 | 18 | 2,306 | 0.8% |
| Portugal | 5 | 4 | 648 | 0.7% |
| Puerto Rico | 1 | 2 | 192 | 2.1% |
| Russia | 64 | 37 | 4,219 | 0.02% |
| Saint Vincent and the Grenadines | 1 | 2 | 29 | 9.2% |
| Saudi Arabia | 2 | 2 | 297 | 0.02% |
| Solomon Islands | 14 | 7 | 1,038 | 4.0% |
| South Africa | 1 | 1 | 243 | 0.02% |
| South Georgia and the South Sandwich Islands | 1 | 1 | 82 | 2.2% |
| South Korea | 5 | 6 | 702 | 0.7% |
| Spain | 11 | 1 | 101 | 0.02% |
| Sri Lanka | 1 | 2 | 154 | 0.2% |
| Sweden | 3 | 3 | 176 | 0.04% |
| Taiwan | 1 | 1 | 108 | 0.3% |
| Tajikistan | 1 | 2 | 157 | 0.1% |
| Thailand | 2 | 8 | 874 | 0.2% |
| The Bahamas | 10 | 5 | 857 | 6.7% |
| Trinidad and Tobago | 1 | 1 | 223 | 4.4% |
| Tunisia | 2 | 1 | 89 | 0.06% |
| Turkey | 2 | 1 | 244 | 0.03% |
| Turkmenistan | 1 | 1 | 113 | 0.02% |
| Ukraine | 1 | 1 | 209 | 0.04% |
| United Arab Emirates | 1 | 4 | 546 | 0.8% |
| United Kingdom | 14 | 9 | 748 | 0.3% |
| United States | 49 | 78 | 7,886 | 0.08% |
| Uzbekistan | 2 | 1 | 61 | 0.01% |
| Vanuatu | 11 | 3 | 506 | 4.5% |
| Venezuela | 3 | 2 | 261 | 0.03% |
| Vietnam | 2 | 6 | 571 | 0.2% |
| Yemen | 2 | 3 | 203 | 0.04% |

</details>
