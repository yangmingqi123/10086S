import { Button, HStack, Image, List, Navigation, NavigationStack, Script, Section, Spacer, Text, TextField, useEffect, useState } from "scripting"
import { readBodyMassData, writeBodyMassData } from "./data"

const bodyMassUnit = HealthUnit.gramUnit(HealthMetricPrefix.kilo)

function View() {
  const dismiss = Navigation.useDismiss()
  const [
    records,
    setRecords
  ] = useState<(HealthQuantitySample)[]>([])
  const [
    bodyMass,
    setBodyMass
  ] = useState("")
  const bodyMassValue = parseFloat(bodyMass)

  useEffect(() => {
    readBodyMassData().then((data) => {
      setRecords(data)
    })
  }, [])

  const addRecord = async () => {
    const sample = await writeBodyMassData(bodyMassValue)
    if (sample) {
      setRecords((prev) => [sample, ...prev])
      setBodyMass("") // Clear the input field
    } else {
      await Dialog.alert({
        title: "Error",
        message: "Failed to record body mass. Please try again."
      })
    }
  }

  const deleteRecord = async (record: HealthQuantitySample) => {
    const index = await Dialog.actionSheet({
      title: "Delete Record",
      message: `Are you sure you want to delete the record from ${record.startDate.toLocaleString()}?`,
      actions: [
        { label: "Delete", destructive: true },
      ]
    })
    if (index === 0) {
      try {
        await Health.deleteObject(record)
        setRecords((prev) => prev.filter((r) => r.uuid !== record.uuid))
      } catch (e) {
        console.error("Failed to delete record:", e)
        await Dialog.alert({
          title: "Error",
          message: "Failed to delete record. Please try again."
        })
      }
    }
  }

  return <NavigationStack>
    <List
      navigationTitle="Record Body Mass"
      navigationBarTitleDisplayMode="inline"
      toolbar={{
        cancellationAction: <Button
          title="Done"
          action={dismiss}
        />
      }}
      scrollDismissesKeyboard={"immediately"}
    >
      <Section>
        <TextField
          title={"Body Mass (kg)"}
          value={bodyMass}
          onChanged={setBodyMass}
          keyboardType={"decimalPad"}
        />
        <Button
          title={"Add Record"}
          disabled={isNaN(bodyMassValue) || bodyMassValue <= 0}
          action={addRecord}
        />
      </Section>

      <Section
        header={
          <Text
            textCase={null}
          >Recent Records</Text>
        }
      >
        {records.length > 0
          ? records.map((record) =>
            <HStack>
              <Button action={() => {
                deleteRecord(record)
              }}>
                <Image
                  systemName={"minus.circle.fill"}
                  foregroundStyle={"systemRed"}
                  font={"title2"}
                />
              </Button>
              <Text>
                {record.startDate.toLocaleString()}
              </Text>
              <Spacer />
              <Text
                font={"callout"}
                foregroundStyle={"secondaryLabel"}
              >
                {record.quantityValue(bodyMassUnit).toString()} {bodyMassUnit.unitString}
              </Text>
            </HStack>
          )
          : <Text>No Records</Text>}
      </Section>
    </List>
  </NavigationStack>
}

async function run() {
  await Navigation.present(
    <View />
  )

  Script.exit()
}

run()