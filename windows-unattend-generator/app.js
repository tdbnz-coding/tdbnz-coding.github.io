(() => {
  'use strict';

  const form = document.querySelector('#unattendForm');
  const xmlCode = document.querySelector('#xmlPreview code');
  const validationBox = document.querySelector('#validationMessages');
  const downloadButton = document.querySelector('#downloadXml');
  const copyButton = document.querySelector('#copyXml');
  const savePresetButton = document.querySelector('#savePreset');
  const loadPresetButton = document.querySelector('#loadPreset');
  const presetFile = document.querySelector('#presetFile');
  const automaticDiskOptions = document.querySelector('#automaticDiskOptions');
  const localAccountOptions = document.querySelector('#localAccountOptions');
  const notesList = document.querySelector('#notesList');
  const toast = document.querySelector('#toast');
  const themeToggle = document.querySelector('#themeToggle');
  let currentXml = '';
  let toastTimer = 0;

  const boolNames = [
    'confirmWipe', 'skipPrivacy', 'hideOnline', 'disableAds', 'disableTips',
    'disableLocation', 'disableOneDrive', 'bypassTpm', 'bypassSecureBoot',
    'bypassRam', 'bypassCpu'
  ];

  function escapeXml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function indent(value, spaces = 2) {
    const prefix = ' '.repeat(spaces);
    return String(value).split('\n').map(line => prefix + line).join('\n');
  }

  function component(name, contents) {
    return `<component name="${name}" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">\n${indent(contents.trim(), 2)}\n</component>`;
  }

  function powershellEncodedCommand(script) {
    let binary = '';
    for (let index = 0; index < script.length; index += 1) {
      const code = script.charCodeAt(index);
      binary += String.fromCharCode(code & 0xff, code >>> 8);
    }
    return btoa(binary);
  }

  function readSettings() {
    const data = Object.fromEntries(new FormData(form).entries());
    for (const name of boolNames) data[name] = Boolean(form.elements[name]?.checked);
    return data;
  }

  function validate(settings) {
    const errors = [];
    const computer = settings.computerName.trim();
    const username = settings.username.trim();
    const productKey = settings.productKey.trim();

    document.querySelector('#computerName').removeAttribute('aria-invalid');
    document.querySelector('#username').removeAttribute('aria-invalid');
    document.querySelector('#productKey').removeAttribute('aria-invalid');

    if (!computer) {
      errors.push('Enter a computer name or use * for a random Windows name.');
      document.querySelector('#computerName').setAttribute('aria-invalid', 'true');
    } else if (computer !== '*' && (!/^[A-Za-z0-9-]{1,63}$/.test(computer) || /^\d+$/.test(computer))) {
      errors.push('Computer name must use letters, numbers or hyphens, and cannot contain only numbers.');
      document.querySelector('#computerName').setAttribute('aria-invalid', 'true');
    }

    if (productKey && !/^([A-Za-z0-9]{5}-){4}[A-Za-z0-9]{5}$/.test(productKey)) {
      errors.push('Product key must use the format XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.');
      document.querySelector('#productKey').setAttribute('aria-invalid', 'true');
    }

    if (settings.diskMode === 'automatic' && !settings.confirmWipe) {
      errors.push('Confirm that automatic disk mode will erase the selected disk.');
    }

    if (settings.accountMode === 'local') {
      const forbidden = /["/\\\[\]:;|=,+*?<>@]/;
      const reserved = ['administrator', 'guest', 'defaultaccount', 'wdagutilityaccount'];
      if (!username || forbidden.test(username) || username.endsWith('.') || reserved.includes(username.toLowerCase())) {
        errors.push('Enter a valid, non-reserved local username.');
        document.querySelector('#username').setAttribute('aria-invalid', 'true');
      }
      if (Number(settings.autoLogonCount) > 0 && !settings.password) {
        errors.push('Automatic sign-in requires a password.');
      }
    }

    return errors;
  }

  function createDiskConfiguration(settings) {
    if (settings.diskMode !== 'automatic') return '';

    const diskId = Math.max(0, Number.parseInt(settings.targetDisk, 10) || 0);
    if (settings.partitionStyle === 'mbr') {
      return `<DiskConfiguration>
  <Disk wcm:action="add">
    <DiskID>${diskId}</DiskID>
    <WillWipeDisk>true</WillWipeDisk>
    <CreatePartitions>
      <CreatePartition wcm:action="add">
        <Order>1</Order>
        <Type>Primary</Type>
        <Size>500</Size>
      </CreatePartition>
      <CreatePartition wcm:action="add">
        <Order>2</Order>
        <Type>Primary</Type>
        <Extend>true</Extend>
      </CreatePartition>
    </CreatePartitions>
    <ModifyPartitions>
      <ModifyPartition wcm:action="add">
        <Order>1</Order>
        <PartitionID>1</PartitionID>
        <Active>true</Active>
        <Format>NTFS</Format>
        <Label>System</Label>
      </ModifyPartition>
      <ModifyPartition wcm:action="add">
        <Order>2</Order>
        <PartitionID>2</PartitionID>
        <Format>NTFS</Format>
        <Label>Windows</Label>
        <Letter>C</Letter>
      </ModifyPartition>
    </ModifyPartitions>
  </Disk>
  <WillShowUI>OnError</WillShowUI>
</DiskConfiguration>`;
    }

    return `<DiskConfiguration>
  <Disk wcm:action="add">
    <DiskID>${diskId}</DiskID>
    <WillWipeDisk>true</WillWipeDisk>
    <CreatePartitions>
      <CreatePartition wcm:action="add">
        <Order>1</Order>
        <Type>EFI</Type>
        <Size>260</Size>
      </CreatePartition>
      <CreatePartition wcm:action="add">
        <Order>2</Order>
        <Type>MSR</Type>
        <Size>16</Size>
      </CreatePartition>
      <CreatePartition wcm:action="add">
        <Order>3</Order>
        <Type>Primary</Type>
        <Extend>true</Extend>
      </CreatePartition>
    </CreatePartitions>
    <ModifyPartitions>
      <ModifyPartition wcm:action="add">
        <Order>1</Order>
        <PartitionID>1</PartitionID>
        <Format>FAT32</Format>
        <Label>System</Label>
      </ModifyPartition>
      <ModifyPartition wcm:action="add">
        <Order>2</Order>
        <PartitionID>3</PartitionID>
        <Format>NTFS</Format>
        <Label>Windows</Label>
        <Letter>C</Letter>
      </ModifyPartition>
    </ModifyPartitions>
  </Disk>
  <WillShowUI>OnError</WillShowUI>
</DiskConfiguration>`;
  }

  function createImageInstall(settings) {
    const imageName = `Windows ${settings.windowsVersion} ${settings.edition}`;
    const diskId = Math.max(0, Number.parseInt(settings.targetDisk, 10) || 0);
    const installTo = settings.diskMode === 'automatic'
      ? `\n  <InstallTo>\n    <DiskID>${diskId}</DiskID>\n    <PartitionID>${settings.partitionStyle === 'mbr' ? '2' : '3'}</PartitionID>\n  </InstallTo>`
      : '';
    const showUi = settings.diskMode === 'automatic' ? 'OnError' : 'Always';

    return `<ImageInstall>
  <OSImage>
    <InstallFrom>
      <MetaData wcm:action="add">
        <Key>/IMAGE/NAME</Key>
        <Value>${escapeXml(imageName)}</Value>
      </MetaData>
    </InstallFrom>${installTo}
    <WillShowUI>${showUi}</WillShowUI>
  </OSImage>
</ImageInstall>`;
  }

  function createSetupCommands(settings) {
    const commands = [];
    const addBypass = (enabled, value, description) => {
      if (enabled && settings.windowsVersion === '11') {
        commands.push({
          description,
          command: `reg add "HKLM\\SYSTEM\\Setup\\LabConfig" /v ${value} /t REG_DWORD /d 1 /f`
        });
      }
    };

    addBypass(settings.bypassTpm, 'BypassTPMCheck', 'Bypass TPM compatibility check');
    addBypass(settings.bypassSecureBoot, 'BypassSecureBootCheck', 'Bypass Secure Boot compatibility check');
    addBypass(settings.bypassRam, 'BypassRAMCheck', 'Bypass memory compatibility check');
    addBypass(settings.bypassCpu, 'BypassCPUCheck', 'Bypass processor compatibility check');

    if (!commands.length) return '';
    return `<RunSynchronous>\n${commands.map((item, index) => `  <RunSynchronousCommand wcm:action="add">
    <Order>${index + 1}</Order>
    <Description>${escapeXml(item.description)}</Description>
    <Path>${escapeXml(item.command)}</Path>
  </RunSynchronousCommand>`).join('\n')}\n</RunSynchronous>`;
  }

  function createFirstLogonCommands(settings) {
    const commands = [];
    const add = (enabled, description, command) => {
      if (enabled) commands.push({ description, command });
    };

    add(settings.disableAds, 'Disable advertising ID', 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 0 /f');
    add(settings.disableTips, 'Disable Windows tips', 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SoftLandingEnabled /t REG_DWORD /d 0 /f');
    add(settings.disableTips, 'Disable subscribed suggestions', 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338389Enabled /t REG_DWORD /d 0 /f');
    add(settings.disableLocation, 'Disable Windows location', 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v DisableLocation /t REG_DWORD /d 1 /f');
    add(settings.disableOneDrive, 'Disable OneDrive sync', 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive" /v DisableFileSyncNGSC /t REG_DWORD /d 1 /f');

    if (settings.customScript.trim()) {
      commands.push({
        description: 'Run custom tdbnz coding PowerShell script',
        command: `powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${powershellEncodedCommand(settings.customScript.trim())}`
      });
    }

    if (!commands.length) return '';
    return `<FirstLogonCommands>\n${commands.map((item, index) => `  <SynchronousCommand wcm:action="add">
    <Order>${index + 1}</Order>
    <Description>${escapeXml(item.description)}</Description>
    <CommandLine>${escapeXml(item.command)}</CommandLine>
  </SynchronousCommand>`).join('\n')}\n</FirstLogonCommands>`;
  }

  function createUserAccounts(settings) {
    if (settings.accountMode !== 'local') return '';
    const username = escapeXml(settings.username.trim());
    const displayName = escapeXml(settings.displayName.trim() || settings.username.trim());
    const password = escapeXml(settings.password);
    return `<UserAccounts>
  <LocalAccounts>
    <LocalAccount wcm:action="add">
      <Name>${username}</Name>
      <DisplayName>${displayName}</DisplayName>
      <Group>Administrators</Group>
      <Password>
        <Value>${password}</Value>
        <PlainText>true</PlainText>
      </Password>
    </LocalAccount>
  </LocalAccounts>
</UserAccounts>`;
  }

  function createAutoLogon(settings) {
    if (settings.accountMode !== 'local' || Number(settings.autoLogonCount) < 1 || !settings.password) return '';
    return `<AutoLogon>
  <Enabled>true</Enabled>
  <LogonCount>${Number(settings.autoLogonCount)}</LogonCount>
  <Username>${escapeXml(settings.username.trim())}</Username>
  <Password>
    <Value>${escapeXml(settings.password)}</Value>
    <PlainText>true</PlainText>
  </Password>
</AutoLogon>`;
  }

  function generateXml(settings) {
    const productKey = settings.productKey.trim()
      ? `\n  <ProductKey>\n    <Key>${escapeXml(settings.productKey.trim().toUpperCase())}</Key>\n    <WillShowUI>OnError</WillShowUI>\n  </ProductKey>`
      : '';
    const disk = createDiskConfiguration(settings);
    const setupCommands = createSetupCommands(settings);
    const setupParts = [
      disk,
      createImageInstall(settings),
      `<UserData>\n  <AcceptEula>true</AcceptEula>\n  <FullName>${escapeXml(settings.registeredOwner.trim() || 'Windows User')}</FullName>\n  <Organization></Organization>${productKey}\n</UserData>`,
      setupCommands
    ].filter(Boolean).join('\n');

    const international = `<InputLocale>${escapeXml(settings.inputLocale)}</InputLocale>
<SystemLocale>${escapeXml(settings.userLocale)}</SystemLocale>
<UILanguage>${escapeXml(settings.uiLanguage)}</UILanguage>
<UserLocale>${escapeXml(settings.userLocale)}</UserLocale>`;

    const shellSpecialize = `<ComputerName>${escapeXml(settings.computerName.trim())}</ComputerName>
<RegisteredOwner>${escapeXml(settings.registeredOwner.trim() || 'Windows User')}</RegisteredOwner>
<RegisteredOrganization></RegisteredOrganization>
<TimeZone>${escapeXml(settings.timeZone)}</TimeZone>`;

    const oobe = `<OOBE>
  <HideEULAPage>true</HideEULAPage>
  <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
  <HideOnlineAccountScreens>${settings.hideOnline && settings.accountMode === 'local' ? 'true' : 'false'}</HideOnlineAccountScreens>
  <ProtectYourPC>${settings.skipPrivacy ? '3' : '1'}</ProtectYourPC>
</OOBE>`;

    const shellParts = [
      oobe,
      createUserAccounts(settings),
      createAutoLogon(settings),
      createFirstLogonCommands(settings)
    ].filter(Boolean).join('\n');

    const windowsPe = [
      component('Microsoft-Windows-International-Core-WinPE', `<SetupUILanguage>\n  <UILanguage>${escapeXml(settings.uiLanguage)}</UILanguage>\n</SetupUILanguage>\n${international}`),
      component('Microsoft-Windows-Setup', setupParts)
    ].map(value => indent(value, 2)).join('\n');

    const specialize = [
      component('Microsoft-Windows-International-Core', international),
      component('Microsoft-Windows-Shell-Setup', shellSpecialize)
    ].map(value => indent(value, 2)).join('\n');

    const oobeSystem = [
      component('Microsoft-Windows-International-Core', international),
      component('Microsoft-Windows-Shell-Setup', shellParts)
    ].map(value => indent(value, 2)).join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated locally with the tdbnz coding Windows Unattend Generator by Thomas Bernard. Test before deployment. -->
<unattend xmlns="urn:schemas-microsoft-com:unattend" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <settings pass="windowsPE">
${windowsPe}
  </settings>
  <settings pass="specialize">
${specialize}
  </settings>
  <settings pass="oobeSystem">
${oobeSystem}
  </settings>
</unattend>
`;
  }

  function createNotes(settings) {
    const notes = [
      `Build targets Windows ${settings.windowsVersion} ${settings.edition} on 64-bit hardware.`,
      `The selected display language must exist in the Windows installation media.`,
      settings.diskMode === 'automatic'
        ? `DANGER: disk ${settings.targetDisk || 0} will be erased and configured as ${settings.partitionStyle.toUpperCase()}.`
        : 'Disk selection stays interactive during Windows Setup.',
      settings.accountMode === 'local'
        ? `A local administrator named “${settings.username || 'unnamed'}” will be created.`
        : 'Windows will show its normal account creation experience.',
      'Validate the answer file against the exact Windows image with Windows System Image Manager when possible.',
      'Test the complete installation in a virtual machine before using it on physical hardware.'
    ];

    if (settings.password) notes.splice(4, 0, 'Security: the account password is readable inside the XML file. Protect or delete the file after use.');
    if (settings.productKey) notes.splice(4, 0, 'Security: the product key is readable inside the XML file.');
    if ([settings.bypassTpm, settings.bypassSecureBoot, settings.bypassRam, settings.bypassCpu].some(Boolean)) {
      notes.splice(4, 0, settings.windowsVersion === '11'
        ? 'One or more Windows 11 hardware compatibility checks will be bypassed.'
        : 'Compatibility bypasses are ignored because Windows 10 is selected.');
    }
    if (settings.customScript.trim()) notes.splice(4, 0, 'A custom PowerShell command is encoded to run at first sign-in.');
    return notes;
  }

  function updateConditionalPanels(settings) {
    automaticDiskOptions.hidden = settings.diskMode !== 'automatic';
    localAccountOptions.hidden = settings.accountMode !== 'local';
  }

  function updateSummary(settings) {
    document.querySelector('#summaryWindows').textContent = `${settings.windowsVersion} ${settings.edition}`;
    document.querySelector('#summaryLocale').textContent = settings.userLocale;
    document.querySelector('#summaryDisk').textContent = settings.diskMode === 'automatic'
      ? `Erase disk ${settings.targetDisk || 0}`
      : 'Choose in Setup';
    document.querySelector('#summaryAccount').textContent = settings.accountMode === 'local'
      ? `Local: ${settings.username || '—'}`
      : 'Windows OOBE';
  }

  function render() {
    const settings = readSettings();
    const errors = validate(settings);
    updateConditionalPanels(settings);
    updateSummary(settings);
    currentXml = generateXml(settings);
    xmlCode.textContent = currentXml;
    document.querySelector('#lineCount').textContent = `${currentXml.trimEnd().split('\n').length} lines`;
    downloadButton.disabled = errors.length > 0;
    downloadButton.title = errors.length ? 'Resolve the configuration errors before downloading' : '';

    validationBox.innerHTML = errors.length
      ? `<ul>${errors.map(error => `<li>${escapeXml(error)}</li>`).join('')}</ul>`
      : '';

    notesList.replaceChildren(...createNotes(settings).map(note => {
      const item = document.createElement('li');
      item.textContent = note;
      return item;
    }));
  }

  function download(contents, filename, type) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function applySettings(settings) {
    for (const [name, value] of Object.entries(settings)) {
      const controls = form.elements[name];
      if (!controls) continue;

      if (controls instanceof RadioNodeList) {
        for (const control of controls) {
          if (control.type === 'radio') control.checked = control.value === value;
        }
      } else if (controls.type === 'checkbox') {
        controls.checked = Boolean(value);
      } else {
        controls.value = String(value ?? '');
      }
    }
    render();
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);

  document.querySelector('#showPassword').addEventListener('click', event => {
    const password = document.querySelector('#password');
    const revealing = password.type === 'password';
    password.type = revealing ? 'text' : 'password';
    event.currentTarget.textContent = revealing ? 'Hide' : 'Show';
    event.currentTarget.setAttribute('aria-label', revealing ? 'Hide password' : 'Show password');
  });

  downloadButton.addEventListener('click', () => {
    const errors = validate(readSettings());
    if (errors.length) {
      render();
      showToast('Resolve the highlighted settings first.');
      return;
    }
    download(currentXml, 'autounattend.xml', 'application/xml;charset=utf-8');
    showToast('autounattend.xml downloaded');
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentXml);
      showToast('XML copied to the clipboard');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(xmlCode);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      showToast('XML selected — press Ctrl+C to copy');
    }
  });

  savePresetButton.addEventListener('click', () => {
    const settings = readSettings();
    settings.password = '';
    settings.productKey = '';
    const preset = {
      format: 'tdbnz coding Windows Unattend Generator preset',
      version: 1,
      savedAt: new Date().toISOString(),
      settings
    };
    download(`${JSON.stringify(preset, null, 2)}\n`, 'tdbnz-unattend-settings.json', 'application/json;charset=utf-8');
    showToast('Settings saved without password or product key');
  });

  loadPresetButton.addEventListener('click', () => presetFile.click());
  presetFile.addEventListener('change', async () => {
    const [file] = presetFile.files;
    if (!file) return;
    try {
      const preset = JSON.parse(await file.text());
      if (preset.format !== 'tdbnz coding Windows Unattend Generator preset' || !preset.settings || typeof preset.settings !== 'object') {
        throw new Error('Unsupported preset');
      }
      applySettings(preset.settings);
      showToast('Settings loaded');
    } catch {
      showToast('That file is not a valid tdbnz coding preset');
    } finally {
      presetFile.value = '';
    }
  });

  const previewTab = document.querySelector('#previewTab');
  const notesTab = document.querySelector('#notesTab');
  const xmlPreview = document.querySelector('#xmlPreview');
  const buildNotes = document.querySelector('#buildNotes');

  function selectTab(name) {
    const previewSelected = name === 'preview';
    previewTab.classList.toggle('active', previewSelected);
    notesTab.classList.toggle('active', !previewSelected);
    previewTab.setAttribute('aria-selected', String(previewSelected));
    notesTab.setAttribute('aria-selected', String(!previewSelected));
    xmlPreview.hidden = !previewSelected;
    buildNotes.hidden = previewSelected;
  }

  previewTab.addEventListener('click', () => selectTab('preview'));
  notesTab.addEventListener('click', () => selectTab('notes'));

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.querySelector('span').textContent = theme === 'light' ? '☾' : '☼';
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
  }

  const storedTheme = localStorage.getItem('tdbnz-unattend-theme');
  const initialTheme = storedTheme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(initialTheme);
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('tdbnz-unattend-theme', nextTheme);
    setTheme(nextTheme);
  });

  document.querySelector('#currentYear').textContent = new Date().getFullYear();
  render();
})();
