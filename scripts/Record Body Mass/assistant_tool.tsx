
type RecordBodyMassParams = {
  body_mass: number
  date?: string
}

const recordBodyMassApprovalRequest: AssistantToolApprovalRequestFn<RecordBodyMassParams> = async (
  params,
) => {
  const { body_mass } = params
  return {
    message: `The assistant wants to record your body mass as ${body_mass} kg.`,
    primaryButtonLabel: "Allow"
  }
}

const recordBodyMass: AssistantToolExecuteWithApprovalFn<RecordBodyMassParams> = async (
  params,
  {
    primaryConfirmed,
    secondaryConfirmed,
  }
) => {
  const { body_mass, date } = params

  const startDate = date ? new Date(date) : new Date()
  const endDate = date ? new Date(date) : new Date()

  try {
    if (!Health.isHealthDataAvailable) {
      return {
        success: false,
        message: "Health data is not available on this device."
      }
    }

    const unit = HealthUnit.gramUnit(HealthMetricPrefix.kilo)

    AssistantTool.report("Body mass:" + body_mass + unit.unitString)
    AssistantTool.report("Start Date:" + startDate.toLocaleString())
    AssistantTool.report("End Date:" + endDate.toLocaleString())

    const sample = HealthQuantitySample.create({
      type: "bodyMass",
      startDate: startDate,
      endDate: endDate,
      value: body_mass,
      unit: unit,
    })

    if (!sample) {
      return {
        success: false,
        message: "Failed to create HealthQuantitySample. Check your parameters."
      }
    }

    await Health.saveQuantitySample(sample)

    return {
      success: true,
      message: `Successfully recorded body mass as ${body_mass} ${unit.unitString}.`
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to save body mass: ${error.message || error}`
    }
  }
}

const testRecordBodyMassApprovalFn = AssistantTool.registerApprovalRequest(
  recordBodyMassApprovalRequest
)

const testRecordBodyMassExecuteFn = AssistantTool.registerExecuteToolWithApproval(
  recordBodyMass
)

// Test the tool in the script editor:
testRecordBodyMassApprovalFn({ body_mass: 70.5, date: "2025/07/05 13:00:00" })
testRecordBodyMassExecuteFn({ body_mass: 70.5, date: "2025/07/05 13:00:00" }, {
  primaryConfirmed: true,
  secondaryConfirmed: false
})