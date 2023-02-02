import useAppAdvancedSettings from '@/application/common/useAppAdvancedSettings'
import { devnetApiConfig, mainnetApiConfig } from '@/application/common/apiUrl.config'
import useAppSettings from '@/application/common/useAppSettings'
import Button from '@/components/Button'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import Tabs from '@/components/Tabs'
import Tooltip from '@/components/Tooltip'
import { capitalize, toSentenceCase } from '@/functions/changeCase'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { isPubEqual } from '@/functions/judgers/areEqual'
import { isValidPublicKey } from '@/functions/judgers/dateType'
import { objectMap } from '@/functions/objectMethods'
import { DEVNET_PROGRAM_ID, MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import produce from 'immer'
import { ReactNode, useState } from 'react'

export default function SettingsPage() {
  return (
    <PageLayout mobileBarTitle="Settings" metaTitle="Settings - Raydium">
      <div className="text-3xl font-semibold">Settings</div>
      <ProgramIDTabs />
    </PageLayout>
  )
}

function ProgramIDTabs() {
  const programIds = useAppAdvancedSettings((s) => s.programIds)
  const [tempSettings, setTempSettings] = useState(() => objectMap(programIds, (v) => toPubString(v)))
  const apiUrls = useAppAdvancedSettings((s) => s.apiUrls)
  const [tempApiUrls, setTempApiUrls] = useState(apiUrls)

  const hasUserChangedSettings =
    Object.entries(programIds).some(([key, value]) => !isPubEqual(tempSettings[key], value)) ||
    Object.entries(apiUrls).some(([key, value]) => tempApiUrls[key] !== value)

  const [innerChoice, setInnerChoice] = useState(
    programIds === MAINNET_PROGRAM_ID ? 'mainnet' : programIds === DEVNET_PROGRAM_ID ? 'devnet' : 'customized'
  )
  return (
    <Col className="py-4 gap-8 mx-auto w-[min(1100px,100%)] items-center">
      <Tabs
        values={['mainnet', 'devnet']}
        currentValue={innerChoice}
        onChange={(tabName) => {
          setTempSettings(
            tabName === 'mainnet'
              ? objectMap(MAINNET_PROGRAM_ID, toPubString)
              : objectMap(DEVNET_PROGRAM_ID, toPubString)
          )
          setTempApiUrls(tabName === 'mainnet' ? mainnetApiConfig : devnetApiConfig)
          setInnerChoice(tabName)
        }}
      />

      <div>
        <div className="text-xl font-semibold text-center mb-2">Program ID</div>
        <Col className="mobile:gap-6">
          {Object.entries(tempSettings).map(([programIDName, programIDValue]) => (
            <Fieldset key={programIDName} name={`${toSentenceCase(programIDName)}`} renderFormItem={programIDValue} />
          ))}
        </Col>
      </div>

      <div>
        <div className="text-xl font-semibold text-center mb-2">API</div>
        <Col className="mobile:gap-6">
          {Object.entries(tempApiUrls).map(([apiName, apiValue]) => (
            <Fieldset key={apiName} name={`${toSentenceCase(apiName)}`} renderFormItem={apiValue} />
          ))}
        </Col>
      </div>

      <Button
        size="lg"
        className="w-[320px] frosted-glass-teal mt-5"
        validators={[{ should: hasUserChangedSettings }]}
        onClick={() => {
          useAppAdvancedSettings.setState({
            programIds: objectMap(tempSettings, (v) => toPub(v))
          })
        }}
      >
        Save
      </Button>
    </Col>
  )
}

/**
 *
 * currently don't use
 */
function AdvancedProgramIDEditor() {
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const programIds = useAppAdvancedSettings((s) => s.programIds)
  const [tempSettings, setTempSettings] = useState(() => objectMap(programIds, (v) => toPubString(v)))
  const [tempSettingsValidInfo, setTempSettingsValidInfo] = useState(objectMap(programIds, () => true))
  const hasUserChangedSettings = Object.entries(programIds).some(
    ([key, value]) => !isPubEqual(tempSettings[key], value)
  )
  const totalTempSettingIsValid = Object.values(tempSettingsValidInfo).every((i) => i)
  return (
    <Col className="gap-8 mx-auto w-[min(1100px,100%)]">
      <div className="text-3xl font-semibold text-center">Program ID Editor</div>
      {Object.entries(tempSettings).map(([programIDName, programIDValue]) => (
        <Fieldset
          key={programIDName}
          name={`${capitalize(programIDName)}`}
          renderFormItem={
            <Row className="items-center gap-4">
              <InputBox
                className="grow mobile:text-xs"
                value={programIDValue}
                onUserInput={(text) => {
                  const validResult = isValidPublicKey(text)
                  setTempSettingsValidInfo(
                    produce(tempSettingsValidInfo, (t) => {
                      t[programIDName] = validResult
                    })
                  )
                  setTempSettings(
                    produce(tempSettings, (t) => {
                      t[programIDName] = text
                    })
                  )
                }}
              />
              <Button
                className="frosted-glass-teal"
                validators={[{ should: !isPubEqual(tempSettings[programIDName], MAINNET_PROGRAM_ID[programIDName]) }]}
                onClick={() => {
                  setTempSettingsValidInfo(
                    produce(tempSettingsValidInfo, (t) => {
                      t[programIDName] = true
                    })
                  )
                  setTempSettings(
                    produce(tempSettings, (t) => {
                      t[programIDName] = MAINNET_PROGRAM_ID[programIDName]
                    })
                  )
                }}
              >
                mainnet
              </Button>
              <Button
                className="frosted-glass-teal"
                validators={[{ should: !isPubEqual(tempSettings[programIDName], DEVNET_PROGRAM_ID[programIDName]) }]}
                onClick={() => {
                  setTempSettingsValidInfo(
                    produce(tempSettingsValidInfo, (t) => {
                      t[programIDName] = true
                    })
                  )
                  setTempSettings(
                    produce(tempSettings, (t) => {
                      t[programIDName] = DEVNET_PROGRAM_ID[programIDName]
                    })
                  )
                }}
              >
                devnet
              </Button>
            </Row>
          }
        />
      ))}

      <Button
        size="lg"
        className="w-full frosted-glass-teal mt-5"
        isLoading={isApprovePanelShown}
        validators={[
          { should: hasUserChangedSettings },
          { should: totalTempSettingIsValid, fallbackProps: { children: 'Invalid PublicKey' } }
        ]}
        onClick={() => {
          useAppAdvancedSettings.setState({
            programIds: objectMap(tempSettings, (v) => toPub(v))
          })
        }}
      >
        Save
      </Button>
    </Col>
  )
}

function Fieldset({ name, tooltip, renderFormItem }: { name: string; tooltip?: string; renderFormItem: ReactNode }) {
  return (
    <Grid className="grid-cols-[12em,32em] mobile:grid-cols-1 gap-8 mobile:gap-1">
      <Row className="justify-self-end mobile:justify-self-start items-center">
        <div className="text-lg mobile:text-sm text-[#abc4ff]">{name}</div>
        {tooltip && (
          <Tooltip panelClassName="bg-[#3b4146]" arrowClassName="bg-[#3b4146]">
            <Icon size="sm" heroIconName="question-mark-circle" className="mx-1 cursor-help text-[#abc4ff]" />
            <Tooltip.Panel>
              <p className="w-80">{tooltip}</p>
            </Tooltip.Panel>
          </Tooltip>
        )}
        <div className="text-lg mobile:hidden text-[#abc4ff]">: </div>
      </Row>
      <div className="mobile:text-sm mobile:break-words">{renderFormItem}</div>
    </Grid>
  )
}
