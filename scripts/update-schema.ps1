# TODO: only update when pkt files change

echo "Checking for packetc"
$_ = packetc --help
if (!$?) { 
    echo "Installing packetc"
    cargo install --git https://github.com/EverCrawl/packetc.git
}

git remote update
git submodule update --recursive

echo "Updating schemas"
pushd schemas
git fetch
git checkout master
git pull
popd

echo "Deleting old schemas"
if (Test-Path src/schemas) {
    rm -r -fo src/schemas
}

echo "Compiling schemas"
packetc ts schemas src/schemas

# all the compiled schemas in src/schemas need to be re-exported
$textInfo = (Get-Culture).TextInfo
echo "Collecting compiled schemas"
$index = ""# iterate over every file in src/schemas:
#   get file stem
#   append export
Get-ChildItem -Path src/schemas -Filter *.ts -Recurse -File -Name | ForEach-Object {
    $fname = [System.IO.Path]::GetFileNameWithoutExtension($_)
    $tcase = $textInfo.ToTitleCase($fname)
    $index += "export * as $tcase from `"./$fname`";`n"
}
echo "Writing src/schemas/index.ts"
$index | Out-File -FilePath src/schemas/index.ts

